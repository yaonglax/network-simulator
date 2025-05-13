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
    CircularProgress,
    Select,
} from '@mui/material';
import { DeviceType, PortType } from '@/features/network-topology/types';
import { DEVICE_PORT_CONFIG } from '@/features/network-topology/types/device.types';
import { useNetworkStore } from '@/features/network-topology/store/network-store';

interface ModalWindowProps {
    modalOpen: boolean;
    onClose: () => void;
    onSubmit: (formData: any) => void;
    deviceType: DeviceType | null;
}

const ModalWindow: React.FC<ModalWindowProps> = ({
    modalOpen,
    onClose,
    onSubmit,
    deviceType,
}) => {
    const { devices } = useNetworkStore();
    const [isVlanEnabled, setIsVlanEnabled] = useState(false);
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
        name: string;
        ip_address?: string;
        accessVlan?: number;
        isVlanEnabled?: boolean;
        allowedVlanList?: number[];
        subnet_mask?: string;
        mac_address?: string;
        active?: boolean;
    }>>([]);
    const [portNameErrors, setPortNameErrors] = useState<string[]>([]);
    const [portVlanErrors, setPortVlanErrors] = useState<string[]>([]);
    const [portAllowedVlanErrors, setPortAllowedVlanErrors] = useState<string[]>([]);

    const validatePortNames = (newPorts: typeof ports) => {
        const errors = newPorts.map((port, index) => {
            if (!port.name) return 'Имя порта обязательно';
            if (newPorts.some((p, i) => i !== index && p.name === port.name)) {
                return 'Имена портов должны быть уникальными';
            }
            return '';
        });
        setPortNameErrors(errors);
        return errors.every(e => !e);
    };

    const validateVlanIds = (newPorts: typeof ports) => {
        const errors = newPorts.map((port) => {
            if (port.isVlanEnabled && port.type === 'access' && port.accessVlan !== undefined) {
                if (port.accessVlan < 1 || port.accessVlan > 4094) {
                    return 'VLAN ID должен быть в диапазоне 1–4094';
                }
            }
            return '';
        });
        setPortVlanErrors(errors);
        return errors.every(e => !e);
    };

    const validateAllowedVlanLists = (newPorts: typeof ports) => {
        const errors = newPorts.map((port) => {
            if (port.isVlanEnabled && port.type === 'trunk') {
                if (!port.allowedVlanList || port.allowedVlanList.length === 0) {
                    return 'Список разрешённых VLAN не может быть пустым';
                }
                if (port.allowedVlanList.some(vlan => vlan < 1 || vlan > 4094)) {
                    return 'VLAN IDs должны быть в диапазоне 1–4094';
                }
                const uniqueVlanList = new Set(port.allowedVlanList);
                if (uniqueVlanList.size !== port.allowedVlanList.length) {
                    return 'VLAN IDs должны быть уникальными';
                }
            }
            return '';
        });
        setPortAllowedVlanErrors(errors);
        return errors.every(e => !e);
    };

    const handleAutoCalculate = async () => {
        if (!deviceType) return;

        try {
            setIsCalculating(true);
            const isConnected = await window.electronAPI.backend.checkConnection();
            console.log('Connection status:', isConnected);

            if (!isConnected) {
                throw new Error('No connection to backend');
            }

            const response = await window.electronAPI.backend.calculateDevice({
                type: deviceType,
                network: '192.168.1.0/24',
                portsCount: portCount,
                name: formData.name || undefined,
                ports: ports.map(p => ({
                    type: p.type || 'none',
                    name: p.name || `Port ${ports.indexOf(p) + 1}`,
                    ip_address: p.ip_address,
                    vlan: p.isVlanEnabled && p.type === 'access' ? p.accessVlan : undefined,
                    allowedVlanList: p.isVlanEnabled && p.type === 'trunk' ? p.allowedVlanList : undefined,
                    subnet_mask: p.subnet_mask,
                })),
            });

            if (response.status !== 'success' || !response.data) {
                throw new Error(response.message || 'Неверный формат ответа от сервера');
            }

            const { ip, mac, gateway, ports: calculatedPorts = [] } = response.data;
            setFormData(prev => ({
                ...prev,
                ip_address: ip || prev.ip_address,
                mac_address: mac || prev.mac_address,
                gateway: gateway || prev.gateway,
                name: response.data.name || prev.name,
            }));

            if (Array.isArray(calculatedPorts)) {
                setPortCount(calculatedPorts.length);
                const newPorts = calculatedPorts.map((port: any, index: number) => ({
                    type: (port.type || (isVlanEnabled ? 'access' : 'none')) as PortType,
                    name: port.name || `Port ${index + 1}`,
                    ip_address: port.ip_address || '',
                    accessVlan: isVlanEnabled && port.type === 'access' ? port.vlan : undefined,
                    allowedVlanList: isVlanEnabled && port.type === 'trunk' ? port.allowedVlanList || [1] : undefined,
                    isVlanEnabled: isVlanEnabled,
                    mac_address: port.mac_address,
                    active: deviceType === 'switch' ? undefined : false,
                }));
                setPorts(newPorts);
                validatePortNames(newPorts);
                validateVlanIds(newPorts);
                validateAllowedVlanLists(newPorts);
            }
        } catch (error) {
            console.error('Calculation error:', error);
            if (error instanceof Error) alert(`Error: ${error.message}`);
        } finally {
            setIsCalculating(false);
        }
    };

    const handlePortChange = (index: number, field: string, value: any) => {
        const newPorts = [...ports];
        if (field === 'allowedVlanList') {
            // Разрешить ввод запятых, чисел и промежуточных состояний
            const input = value.replace(/[^0-9,]/g, ''); // Удаляем всё, кроме чисел и запятых
            const vlanList = input
                .split(',')
                .map((v: string) => Number(v.trim()))
                .filter((v: number) => !isNaN(v) && v >= 1 && v <= 4094);
            newPorts[index] = {
                ...newPorts[index],
                allowedVlanList: vlanList.length > 0 ? vlanList : undefined,
            };
        } else {
            newPorts[index] = { ...newPorts[index], [field]: value };
        }
        setPorts(newPorts);
        validatePortNames(newPorts);
        validateVlanIds(newPorts);
        validateAllowedVlanLists(newPorts);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const checkUniqueIpAddress = (ipAddress: string, deviceId: string | null = null): boolean => {
        const allPorts = Object.values(devices).flatMap(device => device.ports || []);
        const relevantPorts = deviceId
            ? allPorts.filter(port => port.deviceId === deviceId)
            : allPorts;
        const existingIps = relevantPorts.map(port => port.ip_address).filter(ip => ip !== undefined);
        return !existingIps.includes(ipAddress);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!validatePortNames(ports) || !validateVlanIds(ports) || !validateAllowedVlanLists(ports)) {
            alert('Пожалуйста, исправьте ошибки в настройках портов');
            return;
        }

        try {
            if (deviceType === 'host') {
                if (!formData.ip_address || !checkUniqueIpAddress(formData.ip_address)) {
                    alert(`IP-адрес ${formData.ip_address} уже существует или не указан!`);
                    window.electronAPI?.focus?.forceFocus();
                    return;
                }

                const updatedPorts = ports.map(port => ({
                    ...port,
                    ip_address: formData.ip_address,
                    name: port.name || `Port ${ports.indexOf(port) + 1}`,
                    type: port.type || 'access',
                    isVlanEnabled: port.isVlanEnabled,
                    accessVlan: port.isVlanEnabled && port.type === 'access' ? port.accessVlan : undefined,
                    allowedVlanList: port.isVlanEnabled && port.type === 'trunk' ? port.allowedVlanList : undefined,
                }));

                onSubmit({
                    ...formData,
                    ports: updatedPorts.map((port, index) => ({
                        ...port,
                        id: `eth${index}`,
                        name: port.name,
                        deviceId: `device-${Date.now()}`,
                        mac_address: port.mac_address || formData.mac_address,
                        type: port.type as PortType,
                        accessVlan: port.accessVlan,
                        allowedVlanList: port.allowedVlanList,
                        isVlanEnabled: port.isVlanEnabled,
                    })),
                });
            } else {
                onSubmit({
                    ...formData,
                    ports: ports.map((port, index) => ({
                        ...port,
                        id: `eth${index}`,
                        name: port.name || `Port ${index + 1}`,
                        deviceId: `device-${Date.now()}`,
                        mac_address: port.mac_address,
                        type: port.type || 'access',
                        accessVlan: port.isVlanEnabled && port.type === 'access' ? port.accessVlan : undefined,
                        allowedVlanList: port.isVlanEnabled && port.type === 'trunk' ? port.allowedVlanList : undefined,
                        isVlanEnabled: port.isVlanEnabled,
                    })),
                });
            }

            onClose();
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Ошибка при сохранении устройства');
        }
    };

    useEffect(() => {
        if (modalOpen) {
            setFormData({
                name: '',
                ip_address: '',
                mac_address: '',
                gateway: '',
            });
            setIsVlanEnabled(false);
            setPortNameErrors([]);
            setPortVlanErrors([]);
            setPortAllowedVlanErrors([]);
        }
    }, [modalOpen]);

    useEffect(() => {
        if (modalOpen && deviceType) {
            const defaultPortCount = deviceType === 'host' ? 1 : DEVICE_PORT_CONFIG[deviceType].defaultPorts;
            setPortCount(defaultPortCount);
            const newPorts = Array(defaultPortCount)
                .fill(0)
                .map((_, index) => ({
                    type: 'access' as PortType,
                    name: `Port ${index + 1}`,
                    ip_address: '',
                    accessVlan: undefined,
                    allowedVlanList: undefined,
                    isVlanEnabled: false,
                    mac_address: '',
                    active: deviceType === 'switch' ? undefined : false,
                }));
            setPorts(newPorts);
            validatePortNames(newPorts);
            validateVlanIds(newPorts);
            validateAllowedVlanLists(newPorts);
        }
    }, [modalOpen, deviceType]);

    const handlePortCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!deviceType) return;

        const newPortCount = Number(e.target.value);
        if (deviceType === 'host' && newPortCount !== 1) {
            alert('Хост может иметь только один порт');
            return;
        }
        setPortCount(newPortCount);

        if (newPortCount > ports.length) {
            const newPorts = [
                ...ports,
                ...Array(newPortCount - ports.length)
                    .fill(0)
                    .map((_, index) => ({
                        type: 'access' as PortType,
                        name: `Port ${ports.length + index + 1}`,
                        ip_address: '',
                        accessVlan: undefined,
                        allowedVlanList: undefined,
                        isVlanEnabled: false,
                        mac_address: '',
                        active: deviceType === 'switch' ? undefined : false,
                    })),
            ];
            setPorts(newPorts);
            validatePortNames(newPorts);
            validateVlanIds(newPorts);
            validateAllowedVlanLists(newPorts);
        } else if (newPortCount < ports.length) {
            const newPorts = ports.slice(0, newPortCount);
            setPorts(newPorts);
            validatePortNames(newPorts);
            validateVlanIds(newPorts);
            validateAllowedVlanLists(newPorts);
        }
    };

    return (
        <Dialog open={modalOpen} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>Add New {deviceType?.toUpperCase() || 'Device'}</DialogTitle>
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
                            error={formData.name === ''}
                            helperText={formData.name === '' ? 'Имя устройства обязательно' : ''}
                        />
                        <Button
                            onClick={handleAutoCalculate}
                            disabled={isCalculating || !deviceType}
                            variant="outlined"
                            sx={{ height: '56px', mt: '8px' }}
                            startIcon={isCalculating ? <CircularProgress size={20} /> : null}
                        >
                            Auto Calculate
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {deviceType && deviceType !== 'host' && (
                            <TextField
                                label="Number of Ports"
                                type="number"
                                inputProps={{
                                    min: DEVICE_PORT_CONFIG[deviceType].minPorts,
                                    max: DEVICE_PORT_CONFIG[deviceType].maxPorts,
                                }}
                                value={portCount}
                                onChange={handlePortCountChange}
                                sx={{ mt: 2 }}
                            />
                        )}

                        <Typography variant="h6" sx={{ mt: 2 }}>
                            Port Configuration
                        </Typography>
                        {ports.map((port, index) => (
                            <Box key={index} sx={{ mt: 2, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                                <Typography variant="subtitle1">Port {index + 1}</Typography>
                                <TextField
                                    margin="dense"
                                    label={`Port Name ${index + 1}`}
                                    value={port.name}
                                    onChange={e => handlePortChange(index, 'name', e.target.value)}
                                    fullWidth
                                    required
                                    error={!!portNameErrors[index]}
                                    helperText={portNameErrors[index]}
                                />
                                <Select
                                    margin="dense"
                                    label="Port Type"
                                    value={port.type || 'access'}
                                    onChange={e => handlePortChange(index, 'type', e.target.value as PortType)}
                                    fullWidth
                                    sx={{ mt: 2 }}
                                >
                                    <MenuItem value="access">Access</MenuItem>
                                    <MenuItem value="trunk">Trunk</MenuItem>
                                </Select>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={port.isVlanEnabled || false}
                                            onChange={e => {
                                                const newPorts = [...ports];
                                                newPorts[index] = {
                                                    ...newPorts[index],
                                                    isVlanEnabled: e.target.checked,
                                                    accessVlan: e.target.checked && newPorts[index].type === 'access' ? (newPorts[index].accessVlan || 1) : undefined,
                                                    allowedVlanList: e.target.checked && newPorts[index].type === 'trunk' ? (newPorts[index].allowedVlanList || [1]) : undefined,
                                                };
                                                setPorts(newPorts);
                                                validateVlanIds(newPorts);
                                                validateAllowedVlanLists(newPorts);
                                            }}
                                        />
                                    }
                                    label="Enable VLAN"
                                    sx={{ mt: 1 }}
                                />
                                {port.isVlanEnabled && port.type === 'access' && (
                                    <TextField
                                        margin="dense"
                                        label="VLAN ID"
                                        type="number"
                                        value={port.accessVlan || ''}
                                        onChange={e => handlePortChange(index, 'accessVlan', Number(e.target.value))}
                                        fullWidth
                                        required
                                        error={!!portVlanErrors[index]}
                                        helperText={portVlanErrors[index] || 'Введите VLAN ID (1–4094)'}
                                        inputProps={{ min: 1, max: 4094 }}
                                    />
                                )}
                                {port.isVlanEnabled && port.type === 'trunk' && (
                                    <TextField
                                        margin="dense"
                                        label="Allowed VLANs"
                                        value={port.allowedVlanList ? port.allowedVlanList.join(',') : ''}
                                        onChange={e => handlePortChange(index, 'allowedVlanList', e.target.value)}
                                        fullWidth
                                        required
                                        error={!!portAllowedVlanErrors[index]}
                                        helperText={portAllowedVlanErrors[index] || 'Введите VLAN IDs через запятую (например, 10,20,30)'}
                                        inputProps={{ pattern: '[0-9,]*' }}
                                    />
                                )}
                            </Box>
                        ))}
                    </Box>

                    {deviceType === 'host' && (
                        <>
                            <TextField
                                margin="dense"
                                name="ip_address"
                                label="Host IP Address"
                                fullWidth
                                value={formData.ip_address}
                                onChange={handleChange}
                                required
                                error={!formData.ip_address}
                                helperText={!formData.ip_address ? 'IP-адрес обязателен' : ''}
                            />
                            <TextField
                                margin="dense"
                                name="mac_address"
                                label="MAC Address"
                                fullWidth
                                value={formData.mac_address}
                                onChange={handleChange}
                                required
                                error={!formData.mac_address}
                                helperText={!formData.mac_address ? 'MAC-адрес обязателен' : ''}
                            />
                            <TextField
                                margin="dense"
                                name="gateway"
                                label="Gateway"
                                fullWidth
                                value={formData.gateway}
                                onChange={handleChange}
                                required
                                error={!formData.gateway}
                                helperText={!formData.gateway ? 'Шлюз обязателен' : ''}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} color="secondary">
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        color="primary"
                        disabled={
                            !deviceType ||
                            portNameErrors.some(e => !!e) ||
                            portVlanErrors.some(e => !!e) ||
                            portAllowedVlanErrors.some(e => !!e)
                        }
                    >
                        Save
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ModalWindow;