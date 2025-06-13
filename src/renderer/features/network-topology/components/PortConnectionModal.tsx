
import React from 'react';
import { Box, MenuItem, Modal, Select, Typography, Button } from '@mui/material';
import { useNetworkStore } from '../store/network-store';
import { Port } from '../types';

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
    // Получаем устройства из стора по id
    const startDevice = useNetworkStore(state => state.devices[deviceIdStart]);
    const endDevice = useNetworkStore(state => state.devices[deviceIdEnd]);
    const connectPorts = useNetworkStore(state => state.connectPorts);

    const [selectedStartPort, setSelectedStartPort] = React.useState<string>('');
    const [selectedEndPort, setSelectedEndPort] = React.useState<string>('');

    // Получаем свободные порты 
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
    const formStyles = {
        '& .MuiInputBase-input': {
            color: 'var(--contrast-white)',
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: 'var(--detail-gray)',
            },
            '&:hover fieldset': {
                borderColor: 'var(--hover-purple)',
            },
            '&.Mui-focused fieldset': {
                borderColor: 'var(--highlight-purple)',

            },
        },
        '& .MuiInputLabel-root': {
            color: 'var(--contrast-white)',
            '&.Mui-focused': {
                color: 'var(--highlight-purple)',
            },
        },
        '& .MuiFormHelperText-root': {
            color: 'rgba(229, 231, 235, 0.5)',
            '&.Mui-error': {
                color: '#f44336',
            },
        },
        '& .MuiSelect-icon': {
            color: 'rgba(229, 231, 235, 0.5)',
        },
        '&.Mui-focused .MuiSelect-icon': {
            color: 'var(--detail-gray)',
        },
        '& .MuiCheckbox-root': {
            color: 'var(--highlight-purple)',
            '&.Mui-checked': {
                color: 'var(--highlight-purple)',
            },
        },
    };
    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 400,
                bgcolor: 'var(--bg-dark-gray)',
                color: 'var(--text-gray)',
                boxShadow: 24,
                p: 4,
                display: 'flex',
                flexDirection: 'column',
                gap: 3
            }}>
                <Typography variant="h6">Соединение портов</Typography>

                <Box sx={{ backgroundColor: 'var(--bg-dark-gray)', color: 'var(--text-gray)' }}>
                    <Typography>
                        {startDevice?.name || `Устройство ${deviceIdStart}`}
                    </Typography>
                    <Select
                        value={selectedStartPort}
                        onChange={(e) => setSelectedStartPort(e.target.value as string)}
                        fullWidth
                        displayEmpty
                        sx={{
                            border: '1px solid var(--element-gray)',
                            color: 'var(--text-gray)',
                            '& .MuiSelect-icon': {
                                color: 'var(--highlight-purple)',
                            },
                            '&.Mui-focused .MuiSelect-icon': {
                                color: 'var(--detail-gray)',
                            },
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    backgroundColor: 'var(--bg-dark-gray)',
                                    color: 'var(--text-gray)',

                                },
                            },
                        }}
                    >
                        <MenuItem value="" disabled>Выберите порт</MenuItem>
                        {startDevicePorts.length > 0 ? (
                            startDevicePorts.map((port) => (
                                <MenuItem key={port.id} value={port.id} sx={{ backgroundColor: 'var(--bg-dark-gray)', color: 'var(--text-gray)' }}>
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
                        sx={{
                            ...formStyles,
                            color: 'var(--text-gray)',
                            border: '1px solid var(--element-gray)',
                            '& .MuiSelect-icon': {
                                color: 'var(--highlight-purple)',
                            },
                            '&.Mui-focused .MuiSelect-icon': {
                                color: 'var(--detail-gray)',
                            },
                        }}
                        MenuProps={{
                            PaperProps: {
                                sx: {
                                    backgroundColor: 'var(--bg-dark-gray)',
                                    color: 'var(--text-gray)',

                                },
                            },
                        }}
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
                    sx={{
                        mt: 2,
                        backgroundColor: '#8053b0',
                        '&:hover': {
                            backgroundColor: '#6a4299',
                        },
                        '&:disabled': {
                            backgroundColor: 'rgba(229, 231, 235, 0.1)',
                            color: 'rgba(229, 231, 235, 0.3)',
                        }
                    }}
                >
                    Соединить
                </Button>
            </Box>
        </Modal >
    );
};

export default PortConnectionModal;
