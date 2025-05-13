import React from 'react';
import { Box, MenuItem, Modal, Select, Typography, Button } from '@mui/material';
import { useNetworkStore } from '@/features/network-topology/store/network-store';
import { Port } from '@/features/network-topology/types';

interface PortConnectionProps {
    deviceIdStart: string;
    deviceIdEnd: string;
    open: boolean;
    onClose: () => void;
    onConnect: () => void;
}

const PortConnectionModal: React.FC<PortConnectionProps> = ({
    deviceIdEnd,
    deviceIdStart,
    open,
    onClose,
    onConnect
}) => {
    const { devices, connectPorts } = useNetworkStore();
    const [selectedStartPort, setSelectedStartPort] = React.useState<string>('');
    const [selectedEndPort, setSelectedEndPort] = React.useState<string>('');

    // Получаем свободные порты (те, у которых нет connectedTo)
    const getFreePorts = (deviceId: string): Port[] => {
        const device = devices[deviceId];
        if (!device?.ports) return [];
        return device.ports.filter(port => !port.connectedTo);
    };

    const startDevicePorts = getFreePorts(deviceIdStart);
    const endDevicePorts = getFreePorts(deviceIdEnd);

    const handleConnect = () => {
        if (!selectedStartPort || !selectedEndPort) return;

        const startDevice = devices[deviceIdStart];
        const endDevice = devices[deviceIdEnd];

        if (!startDevice || !endDevice) {
            console.error("Устройства не найдены");
            return;
        }

        const startPort = startDevice.ports?.find(p => p.id === selectedStartPort);
        const endPort = endDevice.ports?.find(p => p.id === selectedEndPort);

        if (!startPort || !endPort) {
            console.error("Порты не найдены");
            return;
        }

        console.log("Перед соединением:", {
            startPort: { ...startPort },
            endPort: { ...endPort }
        });

        try {
            // Соединяем порты
            connectPorts(startPort, endPort);

            // Обновляем информацию о портах в консоли
            const updatedStartPort = startDevice.ports?.find(p => p.id === selectedStartPort);
            const updatedEndPort = endDevice.ports?.find(p => p.id === selectedEndPort);

            console.log("После соединения:", {
                startPort: { ...updatedStartPort },
                endPort: { ...updatedEndPort }
            });

            console.log(devices)

            onConnect();
            onClose();
        } catch (error) {
            console.error("Ошибка при соединении портов:", error);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 3
            }}>
                <Typography variant="h6">Соединение портов</Typography>

                <Box>
                    <Typography>
                        {devices[deviceIdStart]?.name || `Устройство ${deviceIdStart}`}
                    </Typography>
                    <Select
                        value={selectedStartPort}
                        onChange={(e) => setSelectedStartPort(e.target.value as string)}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Выберите порт</MenuItem>
                        {startDevicePorts.length > 0 ? (
                            startDevicePorts.map((port) => (
                                <MenuItem key={port.id} value={port.id}>
                                    {port.name || port.id} ({devices[deviceIdStart].type === 'switch' ? port.id : port.ip_address})
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled>Нет свободных портов</MenuItem>
                        )}
                    </Select>
                </Box>

                <Box>
                    <Typography>
                        {devices[deviceIdEnd]?.name || `Устройство ${deviceIdEnd}`}
                    </Typography>
                    <Select
                        value={selectedEndPort}
                        onChange={(e) => setSelectedEndPort(e.target.value as string)}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>Выберите порт</MenuItem>
                        {endDevicePorts.length > 0 ? (
                            endDevicePorts.map((port) => (
                                <MenuItem key={port.id} value={port.id}>
                                    {port.name || port.id} ({devices[deviceIdEnd].type === 'switch' ? port.id : port.ip_address})
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled>Нет свободных портов</MenuItem>
                        )}
                    </Select>
                </Box>

                <Button
                    variant="contained"
                    onClick={handleConnect}
                    disabled={!selectedStartPort || !selectedEndPort}
                    fullWidth
                >
                    Соединить
                </Button>
            </Box>
        </Modal>
    );
};

export default PortConnectionModal;
