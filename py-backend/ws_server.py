import socketio
from fastapi import FastAPI
import random
import ipaddress
import scapy

# Создаем сервер
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
app = FastAPI()
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

def generate_mac() -> str:
    """Генерирует случайный MAC-адрес в формате XX:XX:XX:XX:XX:XX"""
    return ":".join([f"{random.randint(0x00, 0xff):02x}" for _ in range(6)])

# Функция генерации IP из сети
def generate_ip(network: str) -> str:
    """
    Генерирует случайный IP-адрес из указанной сети
    Пример: generate_ip("192.168.1.0/24") -> "192.168.1.42"
    """
    try:
        net = ipaddress.IPv4Network(network, strict=False)
        # Исключаем первый (сеть) и последний (broadcast) адреса
        hosts = list(net.hosts())
        if not hosts:
            raise ValueError("Network too small to generate IP")
        return str(random.choice(hosts))
    except Exception as e:
        raise ValueError(f"Invalid network: {network} - {str(e)}")
    
    
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")
    
@sio.event
async def calculate_device(sid, data, callback=None):
    try:
        print(f"Calculation request from {sid}: {data}")
        if 'type' not in data or 'network' not in data:
            raise ValueError("Missing required fields: 'type' and 'network'")
    
        result = {
            "ip": generate_ip(data['network']),
            "mac": generate_mac(),
        }
        
        print("Calculated result:", result)
        
        if callback:
            callback({"status": "success", "data": result})
        else:
            await sio.emit('calculate_device_result', result, to=sid)
            
    except Exception as e:
        error_msg = f"Calculation error: {str(e)}"
        print(error_msg)
        
        if callback:
            callback({"status": "error", "message": error_msg})
        else:
            await sio.emit('calculate_device_result', {"message": error_msg}, to=sid)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=5000)
