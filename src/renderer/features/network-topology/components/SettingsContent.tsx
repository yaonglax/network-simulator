import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Checkbox,
    FormControlLabel,
    Select,
    MenuItem,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import { Device, PortType } from "../types";
import { DEVICE_PORT_CONFIG, Port } from "../types/device.types";

interface SettingsContentProps {
    device: Device;
    onSave: (updates: Partial<Device>) => void;
}

const isValidMac = (mac: string) =>
    /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim());

const isValidIp = (ip: string) =>
    /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/.test(ip.trim());

const SettingsContent: React.FC<SettingsContentProps> = ({ device, onSave }) => {
    const [name, setName] = useState(device.name);
    const [mac, setMac] = useState(device.mac_address || "");
    const [ip, setIp] = useState(device.ip_address || "");

    const [isPortConfigOpen, setIsPortConfigOpen] = useState(false);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [newPort, setNewPort] = useState<{
        type: PortType;
        name: string;
        ip_address?: string;
        accessVlan?: number;
        isVlanEnabled?: boolean;
        allowedVlanList?: number[];
        mac_address?: string;
        active: boolean;
    }>({
        type: "access",
        name: "",
        ip_address: device.type === "host" ? device.ip_address : "",
        accessVlan: undefined,
        isVlanEnabled: false,
        allowedVlanList: undefined,
        mac_address: "",
        active: false,
    });
    const [selectedPort, setSelectedPort] = useState<Port | null>(null);
    const [portNameError, setPortNameError] = useState("");
    const [portVlanError, setPortVlanError] = useState("");
    const [portAllowedVlanError, setPortAllowedVlanError] = useState("");

    const [macError, setMacError] = useState<string | null>(null);
    const [ipError, setIpError] = useState<string | null>(null);

    useEffect(() => {
        setName(device.name);
        setMac(device.mac_address || "");
        setIp(device.ip_address || "");
        setMacError(null);
        setIpError(null);
    }, [device]);

    useEffect(() => {
        if (mac && !isValidMac(mac)) {
            setMacError("Некорректный MAC-адрес (пример: AA:BB:CC:DD:EE:FF)");
        } else {
            setMacError(null);
        }
    }, [mac]);

    useEffect(() => {
        if (ip && !isValidIp(ip)) {
            setIpError("Некорректный IP-адрес (пример: 192.168.1.1)");
        } else {
            setIpError(null);
        }
    }, [ip]);

    // Валидация имени порта
    const validatePortName = (portName: string) => {
        if (!portName) {
            setPortNameError("Имя порта обязательно");
            return false;
        }
        if (device.ports?.some((port) => port.name === portName && port !== selectedPort)) {
            setPortNameError("Имя порта должно быть уникальным");
            return false;
        }
        setPortNameError("");
        return true;
    };

    // Валидация VLAN ID
    const validateVlanId = (accessVlan?: number) => {
        if (newPort.isVlanEnabled && newPort.type === "access" && accessVlan !== undefined) {
            if (accessVlan < 1 || accessVlan > 4094) {
                setPortVlanError("VLAN ID должен быть в диапазоне 1–4094");
                return false;
            }
        }
        setPortVlanError("");
        return true;
    };

    // Валидация списка разрешённых VLAN
    const validateAllowedVlanList = (allowedVlanList?: number[]) => {
        if (newPort.isVlanEnabled && newPort.type === "trunk") {
            if (!allowedVlanList || allowedVlanList.length === 0) {
                setPortAllowedVlanError("Список разрешённых VLAN не может быть пустым");
                return false;
            }
            if (allowedVlanList.some((vlan) => vlan < 1 || vlan > 4094)) {
                setPortAllowedVlanError("VLAN IDs должны быть в диапазоне 1–4094");
                return false;
            }
            const uniqueVlanList = new Set(allowedVlanList);
            if (uniqueVlanList.size !== allowedVlanList.length) {
                setPortAllowedVlanError("VLAN IDs должны быть уникальными");
                return false;
            }
        }
        setPortAllowedVlanError("");
        return true;
    };

    const handleSavePort = () => {
        if (!validatePortName(newPort.name) || !validateVlanId(newPort.accessVlan) || !validateAllowedVlanList(newPort.allowedVlanList)) {
            return;
        }

        const portData = {
            id: selectedPort ? selectedPort.id : `eth${device.ports?.length || 0}`,
            name: newPort.name,
            deviceId: device.id,
            type: newPort.type,
            ip_address: device.type === "host" ? ip : newPort.ip_address,
            mac_address: newPort.mac_address || mac,
            accessVlan: newPort.isVlanEnabled && newPort.type === "access" ? newPort.accessVlan : undefined,
            allowedVlanList: newPort.isVlanEnabled && newPort.type === "trunk" ? newPort.allowedVlanList : undefined,
            isVlanEnabled: newPort.isVlanEnabled ?? false,
            active: newPort.active && !selectedPort?.connectedTo,
        };

        let updatedPorts;
        if (selectedPort) {
            updatedPorts = device.ports.map((port) =>
                port.id === selectedPort.id ? portData : port
            );
        } else {
            updatedPorts = [...(device.ports || []), portData];
        }
        onSave({ ports: updatedPorts });

        setIsFormVisible(false);
        setSelectedPort(null);
        setNewPort({
            type: "access",
            name: "",
            ip_address: device.type === "host" ? device.ip_address : "",
            accessVlan: undefined,
            isVlanEnabled: false,
            allowedVlanList: undefined,
            mac_address: "",
            active: false,
        });
        setPortNameError("");
        setPortVlanError("");
        setPortAllowedVlanError("");
    };

    // Обработчик изменения данных порта
    const handlePortChange = (field: string, value: any) => {
        const updatedPort = { ...newPort, [field]: value };
        if (field === "allowedVlanList") {
            const input = value.replace(/[^0-9,]/g, "");
            const vlanList = input
                .split(",")
                .map((v: string) => Number(v.trim()))
                .filter((v: number) => !isNaN(v) && v >= 1 && v <= 4094);
            updatedPort.allowedVlanList = vlanList.length > 0 ? vlanList : undefined;
        }
        setNewPort(updatedPort);
        validatePortName(updatedPort.name);
        validateVlanId(updatedPort.accessVlan);
        validateAllowedVlanList(updatedPort.allowedVlanList);
    };

    const handleSave = () => {
        const updates: Partial<Device> = { name, mac_address: mac, ip_address: ip };
        if (device.type === "host" && device.ports) {
            updates.ports = device.ports.map(port => ({
                ...port,
                ip_address: ip,
            }));
        }

        onSave(updates);
    };

    const isSaveDisabled = !!macError || !!ipError || !name || !mac || !ip;
    const canAddPort = device.ports && device.ports.length < DEVICE_PORT_CONFIG[device.type].maxPorts;

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

    const handleEditPort = (port: Port) => {
        setSelectedPort(port);
        setNewPort({
            type: port.type || "access",
            name: port.name,
            ip_address: port.ip_address,
            accessVlan: port.accessVlan,
            isVlanEnabled: port.isVlanEnabled,
            allowedVlanList: port.allowedVlanList,
            mac_address: port.mac_address,
            active: port.active,
        });
        setIsFormVisible(true);
    };

    const handleAddPort = () => {
        setSelectedPort(null);
        setNewPort({
            type: "none",
            name: "",
            ip_address: device.type === "host" ? device.ip_address : "",
            accessVlan: undefined,
            isVlanEnabled: false,
            allowedVlanList: undefined,
            mac_address: "",
            active: false,
        });
        setIsFormVisible(true);
    };

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Настройки устройства</Typography>
            <TextField
                label="Имя устройства"
                value={name}
                onChange={e => setName(e.target.value)}
                size="small"
                required
                sx={formStyles}
            />
            <TextField
                label="MAC-адрес"
                value={mac}
                onChange={e => setMac(e.target.value)}
                size="small"
                required
                error={!!macError}
                helperText={macError}
                sx={formStyles}
            />
            <TextField
                label="IP-адрес"
                value={ip}
                onChange={e => setIp(e.target.value)}
                size="small"
                required
                error={!!ipError}
                helperText={ipError}
                sx={formStyles}
            />
            <Button
                variant="outlined"
                onClick={() => setIsPortConfigOpen(true)}
                sx={{
                    mt: 2,
                    borderColor: 'var(--secondary-purple)',
                    color: 'var(--accent-purple)',
                    fontWeight: 500,
                    borderWidth: '2px',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                        backgroundColor: 'var(--hover-purple)',
                        color: 'var(--text-gray)',
                    },
                }}
            >
                Изменить конфигурацию портов
            </Button>
            <Button
                variant="contained"
                onClick={handleSave}
                disabled={isSaveDisabled}
                sx={{
                    mt: 2,
                    backgroundColor: '#8053b0',
                    '&:hover': {
                        backgroundColor: '#6a4299',
                    },
                    '&:disabled': {
                        backgroundColor: 'rgba(229, 231, 235, 0.1)',
                        color: 'rgba(229, 231, 235, 0.3)',
                    },
                }}
            >
                Сохранить
            </Button>

            {/* Модальное окно для конфигурации портов */}
            <Dialog open={isPortConfigOpen} onClose={() => setIsPortConfigOpen(false)} maxWidth="sm" fullWidth>
                <form style={{ backgroundColor: 'var(--bg-dark-gray)', color: 'var(--text-gray)' }}>
                    <DialogTitle sx={{ fontSize: '20px', textTransform: 'uppercase', fontWeight: '700' }}>
                        Конфигурация портов
                    </DialogTitle>
                    <DialogContent dividers>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <List>
                                {device.ports.map((port) => (
                                    <ListItem
                                        key={port.id}
                                        sx={{ color: 'var(--contrast-white)' }}
                                        secondaryAction={
                                            <IconButton
                                                edge="end"
                                                onClick={() => handleEditPort(port)}
                                                sx={{ color: 'var(--highlight-purple)' }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemText
                                            primary={port.name}
                                            secondary={`Type: ${port.type || "none"} | Active: ${port.active ? "Yes" : "No"} | Connected: ${port.connectedTo ? "Yes" : "No"
                                                }`}

                                            sx={{
                                                color: 'var(--text-gray)',
                                                '& .MuiTypography-root': {
                                                    color: 'var(--text-gray)'
                                                }
                                            }}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            <Button
                                variant="outlined"
                                onClick={handleAddPort}
                                disabled={!canAddPort}
                                sx={{
                                    mt: 2,
                                    borderColor: 'var(--secondary-purple)',
                                    color: 'var(--accent-purple)',
                                    fontWeight: 500,
                                    borderWidth: '2px',
                                    transition: 'all 0.2s ease',
                                    '&:hover': {
                                        backgroundColor: 'var(--hover-purple)',
                                        color: 'var(--text-gray)',
                                    },
                                    '&:disabled': {
                                        borderColor: 'rgba(229, 231, 235, 0.3)',
                                        color: 'rgba(229, 231, 235, 0.3)',
                                    },
                                }}
                            >
                                <AddIcon sx={{ mr: 1 }} /> Добавить порт
                            </Button>
                            {isFormVisible && (
                                <Box sx={{ mt: 2, ...formStyles }}>
                                    <TextField
                                        margin="dense"
                                        label="Имя порта"
                                        value={newPort.name}
                                        onChange={(e) => handlePortChange("name", e.target.value)}
                                        fullWidth
                                        required
                                        error={!!portNameError}
                                        helperText={portNameError}
                                        sx={formStyles}
                                    />
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                sx={{ '& .MuiSvgIcon-root': { color: 'var(--detail-gray)' } }}
                                                checked={newPort.isVlanEnabled || false}
                                                onChange={(e) =>
                                                    setNewPort({
                                                        ...newPort,
                                                        isVlanEnabled: e.target.checked,
                                                        accessVlan: e.target.checked && newPort.type === "access" ? 1 : undefined,
                                                        allowedVlanList: e.target.checked && newPort.type === "trunk" ? [1] : undefined,
                                                    })
                                                }
                                            />
                                        }
                                        label="Включить VLAN"
                                        sx={{ mt: 1 }}
                                    />

                                    {newPort.isVlanEnabled && (
                                        <Select
                                            margin="dense"
                                            value={newPort.type ?? 'none'}
                                            onChange={(e) => handlePortChange('type', e.target.value as PortType)}
                                            fullWidth
                                            sx={{ mt: 2, mb: 2, color: 'var(--contrast-white)', '& .MuiSelect-icon': { color: '#fff' } }}
                                            MenuProps={{
                                                sx: {
                                                    '& .MuiPaper-root': {
                                                        backgroundColor: 'var(--bg-dark-gray)',
                                                        '& .MuiMenuItem-root': { color: 'var(--contrast-white)' },
                                                    },
                                                },
                                            }}
                                        >
                                            <MenuItem value="none">None</MenuItem>
                                            <MenuItem value="access">Access</MenuItem>
                                            <MenuItem value="trunk">Trunk</MenuItem>
                                        </Select>
                                    )}
                                    {newPort.isVlanEnabled && newPort.type === "access" && (
                                        <TextField
                                            margin="dense"
                                            label="VLAN ID"
                                            type="number"
                                            value={newPort.accessVlan || ""}
                                            onChange={(e) => handlePortChange("accessVlan", Number(e.target.value))}
                                            fullWidth
                                            required
                                            error={!!portVlanError}
                                            helperText={portVlanError || "Введите VLAN ID (1–4094)"}
                                            inputProps={{ min: 1, max: 4094 }}
                                            sx={formStyles}
                                        />
                                    )}
                                    {newPort.isVlanEnabled && newPort.type === "trunk" && (
                                        <TextField
                                            margin="dense"
                                            label="Разрешённые VLAN"
                                            value={newPort.allowedVlanList ? newPort.allowedVlanList.join(",") : ""}
                                            onChange={(e) => handlePortChange("allowedVlanList", e.target.value)}
                                            fullWidth
                                            required
                                            error={!!portAllowedVlanError}
                                            helperText={portAllowedVlanError || "Введите VLAN IDs через запятую (например, 10,20,30)"}
                                            inputProps={{ pattern: "[0-9,]*" }}
                                            sx={formStyles}
                                        />
                                    )}
                                </Box>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsPortConfigOpen(false)} sx={{ color: "var(--detail-gray)" }}>
                            Закрыть
                        </Button>
                        {isFormVisible && (
                            <Button
                                onClick={handleSavePort}
                                disabled={!!portNameError || !!portVlanError || !!portAllowedVlanError}
                                sx={{ color: 'var(--text-gray)' }}
                            >
                                Сохранить
                            </Button>
                        )}
                    </DialogActions>
                </form>
            </Dialog>
        </Box>
    );
};

export default SettingsContent;