import socketio
from fastapi import FastAPI
import random
import ipaddress
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Создаем сервер
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

def generate_mac() -> str:
    """Генерирует случайный MAC-адрес"""
    return ":".join([f"{random.randint(0x00, 0xff):02x}" for _ in range(6)])

def generate_ip(network: str) -> str:
    """Генерирует случайный IP из указанной сети"""
    try:
        net = ipaddress.IPv4Network(network, strict=False)
        hosts = list(net.hosts())
        if not hosts:
            raise ValueError("Network too small to generate IP")
        return str(random.choice(hosts))
    except Exception as e:
        raise ValueError(f"Invalid network: {network} - {str(e)}")

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

@sio.event
async def calculate_device(sid, data, callback=None):
    try:
        logger.info(f"Calculation request from {sid}: {data}")
        
        # Валидация входных данных
        if 'type' not in data or 'network' not in data:
            raise ValueError("Missing required fields: 'type' and 'network'")

        # Генерация IP и MAC
        ip_address = generate_ip(data['network'])
        mac_address = generate_mac()
        ports = []

        if data['type'] == 'switch':
            # Для коммутатора — просто порты с уникальными MAC-адресами
            for idx, port in enumerate(data.get('ports', []), start=1):
                port_data = {
                    "name": f"port{idx}",
                    "vlan": port.get('vlan', 1)
                }
                ports.append(port_data)
        else:
            # Для хоста или других устройств — IP, маска и VLAN
            if 'ports' in data and isinstance(data['ports'], list):
                for port in data['ports']:
                    port_data = {
                        "ip_address": ip_address,
                        "subnet_mask": port.get('subnet_mask', '255.255.255.0'),
                        "vlan": port.get('vlan', 1)
                    }
                    ports.append(port_data)
            else:
                ports = [{
                    "ip_address": ip_address,
                    "subnet_mask": "255.255.255.0",
                    "vlan": 1
                }]

        result = {
            "name": f"{data['type']}-{random.randint(100, 999)}",
            "ip": ip_address,
            "mac": mac_address,
            "gateway": str(ipaddress.IPv4Network(data['network'])[1]),
            "ports": ports
        }
        
        logger.info(f"Calculated result: {result}")
        
        response = {"status": "success", "data": result}
        if callback:
            callback(response)
        else:
            await sio.emit('calculate_device_result', response, to=sid)
            
    except Exception as e:
        error_msg = f"Calculation error: {str(e)}"
        logger.error(error_msg)
        
        response = {"status": "error", "message": error_msg}
        if callback:
            callback(response)
        else:
            await sio.emit('calculate_device_result', response, to=sid)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        socket_app, 
        host="0.0.0.0", 
        port=5000,
        log_level="info"
    )
