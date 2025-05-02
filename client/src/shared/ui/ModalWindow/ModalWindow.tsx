import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    MenuItem,
    Box,
    Typography,
    Checkbox,
    FormControlLabel,
    CircularProgress
} from '@mui/material';
import { DeviceType, PortType } from '@/features/network-topology/types';
import { DEVICE_PORT_CONFIG, Port } from '@/features/network-topology/types/device.types';


interface ModalWindowProps {
    modalOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: any) => void;
    deviceType: DeviceType | null;
}

type Mode = "none" | "vlan"

const ModalWindow: React.FC<ModalWindowProps> = ({
    modalOpen,
    onClose,
    onSubmit,
    deviceType
}) => {
    const [mode, setMode] = useState<Mode>("none")
    const [isChecked, setIsChecked] = useState(false)
    const [isCalculating, setIsCalculating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        ip_address: '',
        mac_address: '',
        gateway: '',
    });

    const [portCount, setPortCount] = useState(
        deviceType ? DEVICE_PORT_CONFIG[deviceType].defaultPorts : 1
    );

    const [ports, setPorts] = useState<Array<{
        type: PortType;
        ip_address?: string;
        vlan?: number;
        subnet_mask?: string;
    }>>([]);

    useEffect(() => {
        if (deviceType) {
            setPortCount(DEVICE_PORT_CONFIG[deviceType].defaultPorts);
        }
    }, [deviceType]);

    useEffect(() => {
        if (modalOpen) {
            setTimeout(() => {
                const firstInput = document.getElementById('device-name-input');
                firstInput?.focus();
            }, 100);
        }
    }, [modalOpen]);
    useEffect(() => {
        setPorts(
            Array(portCount).fill(0).map(() => ({
                type: 'access',
                ip_address: '',
                vlan: 1
            }))
        );
    }, [portCount]);

    const handleAutoCalculate = async () => {
        if (!deviceType) return;

        try {
            setIsCalculating(true);

            const isConnected = await window.electronAPI.backend.checkConnection();
            console.log("Connection status:", isConnected);

            if (!isConnected) {
                throw new Error('No connection to backend');
            }
            const portsData = ports.map(port => ({
                type: port.type,
                ip_address: port.ip_address,
                vlan: port.vlan,
                subnet_mask: port.subnet_mask
            }));
            const calculatedData = await window.electronAPI.backend.calculateDevice({
                type: deviceType,
                network: '192.168.1.0/24',
                portsCount: portCount,
                ports: portsData

            });

            console.log("Calculated data:", calculatedData);

            // 👇 Здесь мы заполняем данные в поля формы и порты
            setFormData(prev => ({
                ...prev,
                ip_address: calculatedData.ip || prev.ip_address,
                mac_address: calculatedData.mac || prev.mac_address,
                gateway: calculatedData.gateway || prev.gateway
            }));

            if (calculatedData.ports && Array.isArray(calculatedData.ports)) {
                setPortCount(calculatedData.ports.length);
                setPorts(
                    calculatedData.ports.map((port: any) => ({
                        type: port.type || 'access',
                        ip_address: port.ip_address || '',
                        vlan: port.vlan || 1
                    }))
                );
            }

        } catch (error) {
            console.error('Calculation error:', error);
            if (error instanceof Error)
                alert(`Error: ${error.message}`);
        } finally {
            setIsCalculating(false);
        }
    };



    const handlePortChange = (index: number, field: string, value: any) => {
        const newPorts = [...ports];
        newPorts[index] = { ...newPorts[index], [field]: value };
        setPorts(newPorts);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };



    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            ...formData,
            ports: ports.map((port, index) => ({
                ...port,
                id: `eth${index}`,
                name: `Port ${index + 1}`,
                deviceId: `device-${Date.now()}`
            }))
        });
        onClose();
    };
    useEffect(() => {
        if (modalOpen) {
            setFormData({
                name: '',
                ip_address: '',
                mac_address: '',
                gateway: '',
            });
            setIsChecked(false);
            setMode("none");
        }
    }, [modalOpen]);

    useEffect(() => {
        if (modalOpen && deviceType) {
            setPortCount(DEVICE_PORT_CONFIG[deviceType].defaultPorts);
            setPorts(
                Array(DEVICE_PORT_CONFIG[deviceType].defaultPorts).fill(0).map(() => ({
                    type: 'access',
                    ip_address: '',
                    vlan: 1
                }))
            );
        }
    }, [modalOpen, deviceType]);
    if (!deviceType) return null;

    return (
        <Dialog open={modalOpen} onClose={onClose} maxWidth="sm" fullWidth disableEnforceFocus={false} // Изменено на false
            disableAutoFocus={false}>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Add New {deviceType.toUpperCase()}</DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <TextField
                            id="device-name-input"
                            autoFocus
                            margin="dense"
                            name="name"
                            label="Device Name"
                            fullWidth
                            value={formData.name}
                            onChange={handleChange}
                            required
                        />
                        <Button
                            onClick={handleAutoCalculate}
                            disabled={isCalculating}
                            variant="outlined"
                            sx={{ height: '56px', mt: '8px' }}
                            startIcon={isCalculating ? <CircularProgress size={20} /> : null}
                        >
                            Auto Calculate
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Number of Ports"
                            type="number"
                            inputProps={{
                                min: DEVICE_PORT_CONFIG[deviceType].minPorts,
                                max: DEVICE_PORT_CONFIG[deviceType].maxPorts
                            }}
                            value={portCount}
                            onChange={(e) => setPortCount(Number(e.target.value))}
                            sx={{ mt: 2 }}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isChecked}
                                    onChange={(e) => {
                                        setIsChecked(e.target.checked)
                                        setMode(mode === 'vlan' ? 'none' : 'vlan')
                                    }}
                                />
                            }
                            label="VLAN"
                        />
                    </Box>


                    {ports.map((port, index) => (
                        <Box key={index} sx={{ mt: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
                            <Typography variant="subtitle1">Port {index + 1}</Typography>
                            {isChecked ?
                                <TextField
                                    select
                                    margin="dense"
                                    label="Port Type"
                                    value={port.type}
                                    onChange={(e) => handlePortChange(index, 'type', e.target.value)}
                                    fullWidth
                                >
                                    <MenuItem value="access">Access</MenuItem>
                                    <MenuItem value="trunk">Trunk</MenuItem>
                                </TextField>
                                :
                                ""}


                            <TextField
                                margin="dense"
                                label="IP Address"
                                value={port.ip_address}
                                onChange={(e) => handlePortChange(index, 'ip_address', e.target.value)}
                                fullWidth
                            />

                            {port.type === 'access' && isChecked ?
                                <TextField
                                    margin="dense"
                                    label="VLAN ID"
                                    type="number"
                                    value={port.vlan}
                                    onChange={(e) => handlePortChange(index, 'vlan', Number(e.target.value))}
                                    fullWidth
                                />
                                : ""
                            }
                        </Box>
                    ))}

                    {deviceType === 'host' && (
                        <>
                            <TextField
                                margin="dense"
                                name="ip_address"
                                label="Host IP Address"
                                fullWidth
                                value={formData.ip_address}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="dense"
                                name="mac_address"
                                label="MAC Address"
                                fullWidth
                                value={formData.mac_address}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="dense"
                                name="gateway"
                                label="Gateway"
                                fullWidth
                                value={formData.gateway}
                                onChange={handleChange}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained">Add Device</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ModalWindow;