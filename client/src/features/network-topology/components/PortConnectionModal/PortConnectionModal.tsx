
import React from 'react';
import { Box, MenuItem, Modal, Select, Typography, Button } from '@mui/material';
import { useNetworkStore } from '@/features/network-topology/store/network-store';
import { Port } from '@/features/network-topology/types';

interface PortConnectionProps {
    deviceId: string;
    deviceIdStart: string;
    deviceIdEnd: string;
    open: boolean;
    onClose: () => void;
    onConnect: () => void;
}

const PortConnectionModal: React.FC<PortConnectionProps> = ({
    deviceId,
    deviceIdEnd,
    deviceIdStart,
    open,
    onClose,
    onConnect
}) => {
    // Получаем устройства из стора по id — всегда актуальные!
    const startDevice = useNetworkStore(state => state.devices[deviceIdStart]);
    const endDevice = useNetworkStore(state => state.devices[deviceIdEnd]);
    const connectPorts = useNetworkStore(state => state.connectPorts);

    const [selectedStartPort, setSelectedStartPort] = React.useState<string>('');
    const [selectedEndPort, setSelectedEndPort] = React.useState<string>('');

    // Получаем свободные порты (те, у которых нет connectedTo)
    const getFreePorts = (device?: typeof startDevice): Port[] => {
        if (!device?.ports) return [];
        return device.ports.filter(port => !port.connectedTo);
    };

    const startDevicePorts = getFreePorts(startDevice);
    const endDevicePorts = getFreePorts(endDevice);

    const handleConnect = () => {
        if (!selectedStartPort || !selectedEndPort) return;

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

        try {
            connectPorts(startPort, endPort);
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
                        {startDevice?.name || `Устройство ${deviceIdStart}`}
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
                                    {port.name || port.id} ({startDevice.type === 'switch' ? port.id : port.ip_address})
                                </MenuItem>
                            ))
                        ) : (
                            <MenuItem disabled>Нет свободных портов</MenuItem>
                        )}
                    </Select>
                </Box>

                <Box>
                    <Typography>
                        {endDevice?.name || `Устройство ${deviceIdEnd}`}
                    </Typography>
                    <Select
                        value={selectedEndPort}
                        onChange={(e) => setSelectedEndPort(e.target.value as string)}
                        fullWidth
                        displayEmpty
                    >
                        <MenuItem value="" disabled>
                            Выберите порт
                        </MenuItem>


                        {endDevicePorts.length > 0 ? (
                            endDevicePorts.map((port) => (
                                <MenuItem key={port.id} value={port.id}>
                                    {port.name || port.id} (
                                    {endDevice.type === "switch"
                                        ? port.id
                                        : endDevice.ip_address || "нет IP"}
                                    )
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
