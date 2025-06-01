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

const ipRegex = /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/;
const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;

const ModalWindow: React.FC<ModalWindowProps> = ({
    modalOpen,
    onClose,
    onSubmit,
    deviceType,
}) => {
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

    const [submitAttempted, setSubmitAttempted] = useState(false);
    const { devices } = useNetworkStore();
    const [isVlanEnabled, setIsVlanEnabled] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        ip_address: '',
        mac_address: '',
        gateway: '',
    });
    const [portCount, setPortCount] = useState(deviceType ? DEVICE_PORT_CONFIG[deviceType].defaultPorts : 1);
    const [ports, setPorts] = useState<
        Array<{
            type: PortType;
            name: string;
            ip_address?: string;
            accessVlan?: number;
            isVlanEnabled?: boolean;
            allowedVlanList?: number[];
            allowedVlanListRaw?: string;
            subnet_mask?: string;
            mac_address?: string;
            active?: boolean;
        }>
    >([]);
    const [portNameErrors, setPortNameErrors] = useState<string[]>([]);
    const [portVlanErrors, setPortVlanErrors] = useState<string[]>([]);
    const [portAllowedVlanErrors, setPortAllowedVlanErrors] = useState<string[]>([]);
    const [ipError, setIpError] = useState('');
    const [macError, setMacError] = useState('');

    const validatePortNames = (newPorts: typeof ports) => {
        const errors = newPorts.map((port, index) => {
            if (!submitAttempted) return '';
            if (!port.name) return 'Имя порта обязательно';
            if (newPorts.some((p, i) => i !== index && p.name === port.name)) {
                return 'Имена портов должны быть уникальными';
            }
            return '';
        });
        setPortNameErrors(errors);
        return errors.every((e) => !e);
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
        return errors.every((e) => !e);
    };

    const validateAllowedVlanLists = (newPorts: typeof ports) => {
        const errors = newPorts.map((port) => {
            if (port.isVlanEnabled && port.type === 'trunk') {
                const rawInput = port.allowedVlanListRaw || port.allowedVlanList?.join(',') || '';
                const vlanList = rawInput
                    .split(',')
                    .map((v: string) => Number(v.trim()))
                    .filter((v: number) => !isNaN(v));

                if (!vlanList || vlanList.length === 0) {
                    return 'Список разрешённых VLAN не может быть пустым';
                }
                if (vlanList.some((vlan) => vlan < 1 || vlan > 4094)) {
                    return 'VLAN IDs должны быть в диапазоне 1–4094';
                }
                const uniqueVlanList = new Set(vlanList);
                if (uniqueVlanList.size !== vlanList.length) {
                    return 'VLAN IDs должны быть уникальными';
                }
                port.allowedVlanList = vlanList;
            }
            return '';
        });
        setPortAllowedVlanErrors(errors);
        return errors.every((e) => !e);
    };

    const handleAutoCalculate = async () => {
        if (!deviceType) return;

        try {
            setIsCalculating(true);
            const requestData = {
                type: deviceType,
                network: '192.168.1.0/24',
                portsCount: portCount,
                name: formData.name || undefined,
                ports: ports.map((p) => ({
                    type: p.type || 'none',
                    name: p.name || `Port ${ports.indexOf(p) + 1}`,
                    ip_address: p.ip_address,
                    vlan: p.isVlanEnabled && p.type === 'access' ? p.accessVlan : undefined,
                    allowedVlanList: p.isVlanEnabled && p.type === 'trunk' ? p.allowedVlanList : undefined,
                    subnet_mask: p.subnet_mask,
                })),
            };
            console.log('Sending calculate-device request:', requestData);
            const response = await window.electronAPI.backend.calculateDevice(requestData);

            if (response.status !== 'success' || !response.data) {
                throw new Error(response.message || 'Неверный формат ответа');
            }

            const { ip, mac, gateway, ports: calculatedPorts = [] } = response.data;
            setFormData((prev) => ({
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
            console.error('Ошибка расчёта:', error);
            if (error instanceof Error) alert(`Ошибка: ${error.message}`);
        } finally {
            setIsCalculating(false);
        }
    };

    const handlePortChange = (index: number, field: string, value: any) => {
        const newPorts = [...ports];
        if (field === 'allowedVlanList') {
            console.log('Changing allowedVlanListRaw to:', value);
            newPorts[index] = {
                ...newPorts[index],
                allowedVlanListRaw: value,
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
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const checkUniqueIpAddress = (ipAddress: string, deviceId: string | null = null): boolean => {
        const allPorts = Object.values(devices).flatMap((device) => device.ports || []);
        const relevantPorts = deviceId ? allPorts.filter((port) => port.deviceId === deviceId) : allPorts;
        const existingIps = relevantPorts.map((port) => port.ip_address).filter((ip) => ip !== undefined);
        return !existingIps.includes(ipAddress);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitAttempted(true);

        const finalPorts = ports.map((port) => {
            if (port.isVlanEnabled && port.type === 'trunk' && port.allowedVlanListRaw) {
                const vlanList = port.allowedVlanListRaw
                    .split(',')
                    .map((v: string) => Number(v.trim()))
                    .filter((v: number) => !isNaN(v));
                return {
                    ...port,
                    allowedVlanList: vlanList.length > 0 ? vlanList : undefined,
                    allowedVlanListRaw: undefined,
                };
            }
            return port;
        });

        if (!validatePortNames(finalPorts) || !validateVlanIds(finalPorts) || !validateAllowedVlanLists(finalPorts)) {
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

                const updatedPorts = finalPorts.map((port) => ({
                    ...port,
                    ip_address: formData.ip_address,
                    name: port.name || `Port ${finalPorts.indexOf(port) + 1}`,
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
                    ports: finalPorts.map((port, index) => ({
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
            setSubmitAttempted(false);
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
            setIpError('');
            setMacError('');
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
        const minPorts = DEVICE_PORT_CONFIG[deviceType].minPorts;
        const maxPorts = DEVICE_PORT_CONFIG[deviceType].maxPorts;
        if (newPortCount < minPorts || newPortCount > maxPorts) {
            alert(`Количество портов для ${deviceType} должно быть от ${minPorts} до ${maxPorts}`);
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

    const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, ip_address: value }));
        if (value && !ipRegex.test(value)) {
            setIpError('Некорректный формат IP-адреса');
        } else {
            setIpError('');
        }
    };

    const handleMacChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setFormData((prev) => ({ ...prev, mac_address: value }));
        if (value && !macRegex.test(value)) {
            setMacError('Некорректный формат MAC-адреса');
        } else {
            setMacError('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        console.log('Key pressed:', e.key, 'Code:', e.code);
        if (e.key === ',' || e.code === 'Comma') {
            console.log('Comma detected!');
        }
    };

    return (
        <Dialog open={modalOpen} onClose={onClose} maxWidth="sm" fullWidth>
            <form onSubmit={handleSubmit} style={{ backgroundColor: 'var(--bg-dark-gray)', color: 'var(--text-gray)' }}>
                <DialogTitle sx={{ fontSize: '20px', textTransform: 'uppercase', fontWeight: '700' }}>
                    Добавить новое устройство: {deviceType?.toUpperCase() || 'Device'}
                </DialogTitle>
                <DialogContent dividers>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'start', mb: 2 }}>
                        <TextField
                            id="device-name-input"
                            autoFocus
                            margin="dense"
                            name="name"
                            label="Имя устройства"
                            fullWidth
                            value={formData.name}
                            onChange={handleChange}
                            required
                            error={submitAttempted && formData.name === ''}
                            helperText={submitAttempted && formData.name === '' ? 'Имя устройства обязательно' : ''}
                            sx={formStyles}
                        />
                        <Button
                            onClick={handleAutoCalculate}
                            disabled={isCalculating || !deviceType}
                            variant="outlined"
                            sx={{
                                height: '56px',
                                mt: '8px',
                                borderColor: 'var(--secondary-purple)',
                                color: 'var(--accent-purple)',
                                fontWeight: 500,
                                width: '260px',
                                borderWidth: '2px',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                    backgroundColor: 'var(--hover-purple)',
                                    color: 'var(--text-gray)',
                                },
                            }}
                            startIcon={isCalculating ? <CircularProgress size={20} /> : null}
                        >
                            {isCalculating ? '' : 'Рассчитать автоматически'}
                        </Button>
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...formStyles }}>
                        {deviceType && (
                            <TextField
                                label="Количество портов"
                                type="number"
                                inputProps={{
                                    min: DEVICE_PORT_CONFIG[deviceType].minPorts,
                                    max: DEVICE_PORT_CONFIG[deviceType].maxPorts,
                                }}
                                value={portCount}
                                onChange={handlePortCountChange}
                                sx={{ mt: 2 }}
                                helperText={`Для ${deviceType === 'host' ? 'хоста' : deviceType} от ${DEVICE_PORT_CONFIG[deviceType].minPorts} до ${DEVICE_PORT_CONFIG[deviceType].maxPorts} портов`}
                            />
                        )}

                        <Typography variant="h6" sx={{ mt: 2 }}>
                            Конфигурация порта
                        </Typography>
                        {ports.map((port, index) => (
                            <Box key={index} sx={{ mt: 2, p: 2, border: '1px solid var(--element-gray)', borderRadius: 1 }}>
                                <Typography variant="subtitle1">Порт {index + 1}</Typography>
                                <TextField
                                    margin="dense"
                                    label={`Имя порта ${index + 1}`}
                                    value={port.name}
                                    onChange={(e) => handlePortChange(index, 'name', e.target.value)}
                                    fullWidth
                                    required
                                    error={!!portNameErrors[index]}
                                    helperText={portNameErrors[index]}
                                    sx={formStyles}
                                />

                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            sx={{ '& .MuiSvgIcon-root': { color: 'var(--detail-gray)' } }}
                                            checked={port.isVlanEnabled || false}
                                            onChange={(e) => {
                                                const newPorts = [...ports];
                                                newPorts[index] = {
                                                    ...newPorts[index],
                                                    isVlanEnabled: e.target.checked,
                                                    accessVlan:
                                                        e.target.checked && newPorts[index].type === 'access'
                                                            ? newPorts[index].accessVlan || 1
                                                            : undefined,
                                                    allowedVlanList:
                                                        e.target.checked && newPorts[index].type === 'trunk'
                                                            ? newPorts[index].allowedVlanList || [1]
                                                            : undefined,
                                                };
                                                setPorts(newPorts);
                                                validateVlanIds(newPorts);
                                                validateAllowedVlanLists(newPorts);
                                            }}
                                        />
                                    }
                                    label="Включить VLAN"
                                    sx={{ mt: 1 }}
                                />
                                {port.isVlanEnabled && (
                                    <Select
                                        margin="dense"
                                        value={port.type ?? 'none'}
                                        onChange={(e) => handlePortChange(index, 'type', e.target.value as PortType)}
                                        fullWidth
                                        sx={{ mt: 2, mb: 2, color: 'white', '& .MuiSelect-icon': { color: '#fff' } }}
                                        MenuProps={{
                                            sx: {
                                                '& .MuiPaper-root': {
                                                    backgroundColor: '#181C22',
                                                    '& .MuiMenuItem-root': { color: 'white' },
                                                },
                                            },
                                        }}
                                    >
                                        <MenuItem value="none">None</MenuItem>
                                        <MenuItem value="access">Access</MenuItem>
                                        <MenuItem value="trunk">Trunk</MenuItem>
                                    </Select>
                                )}

                                {port.isVlanEnabled && port.type === 'access' && (
                                    <TextField
                                        margin="dense"
                                        label="VLAN ID"
                                        type="number"
                                        value={port.accessVlan || ''}
                                        onChange={(e) => handlePortChange(index, 'accessVlan', Number(e.target.value))}
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
                                        label="Разрешённые VLAN"
                                        value={port.allowedVlanListRaw || port.allowedVlanList?.join(',') || ''}
                                        onChange={(e) => {
                                            const input = e.target.value;
                                            console.log('Input value:', input);
                                            handlePortChange(index, 'allowedVlanList', input);
                                        }}
                                        onKeyDown={handleKeyDown}
                                        onPaste={(e) => {
                                            const pasted = e.clipboardData.getData('text');
                                            console.log('Pasted value:', pasted);
                                            handlePortChange(index, 'allowedVlanList', pasted);
                                        }}
                                        fullWidth
                                        required
                                        error={!!portAllowedVlanErrors[index]}
                                        helperText={
                                            portAllowedVlanErrors[index] || 'Введите VLAN IDs через запятую (например, 10,20,30)'
                                        }
                                        inputProps={{}}
                                        sx={formStyles}
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
                                label="IP-адрес хоста"
                                fullWidth
                                value={formData.ip_address}
                                onChange={handleIpChange}
                                required
                                error={!!ipError}
                                helperText={ipError || 'Этот IP-адрес будет назначен всем портам хоста.'}
                                sx={{ mt: 2, ...formStyles }}
                            />
                            <TextField
                                margin="dense"
                                name="mac_address"
                                label="MAC-адрес"
                                fullWidth
                                value={formData.mac_address}
                                onChange={handleMacChange}
                                required
                                error={!!macError}
                                helperText={macError || ''}
                                sx={{ mt: 2, ...formStyles }}
                            />
                            <TextField
                                margin="dense"
                                name="gateway"
                                label="Шлюз"
                                fullWidth
                                value={formData.gateway}
                                onChange={handleChange}
                                required
                                error={submitAttempted && !formData.gateway}
                                helperText={submitAttempted && !formData.gateway ? 'Шлюз обязателен' : ''}
                                sx={{ mt: 2, ...formStyles }}
                            />
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose} sx={{ color: "var(--detail-gray)" }}>
                        Отмена
                    </Button>
                    <Button
                        type="submit"
                        disabled={
                            !deviceType ||
                            (submitAttempted && (
                                portNameErrors.some((e) => !!e) ||
                                portVlanErrors.some((e) => !!e) ||
                                portAllowedVlanErrors.some((e) => !!e)
                            ))
                        }
                        sx={{ color: 'var(--text-gray)' }}
                    >
                        Сохранить
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ModalWindow;