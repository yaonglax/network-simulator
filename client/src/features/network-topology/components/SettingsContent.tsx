
import React, { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Device } from "@/features/network-topology/types";

interface SettingsContentProps {
    device: Device;
    onSave: (updates: Partial<Device>) => void;
}

// Валидация MAC-адреса (формат XX:XX:XX:XX:XX:XX)
const isValidMac = (mac: string) =>
    /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/.test(mac.trim());

// Валидация IPv4-адреса
const isValidIp = (ip: string) =>
    /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/.test(ip.trim());

const SettingsContent: React.FC<SettingsContentProps> = ({ device, onSave }) => {
    const [name, setName] = useState(device.name);
    const [mac, setMac] = useState(device.mac_address || "");
    const [ip, setIp] = useState(device.ip_address || "");

    const [macError, setMacError] = useState<string | null>(null);
    const [ipError, setIpError] = useState<string | null>(null);

    useEffect(() => {
        setName(device.name);
        setMac(device.mac_address || "");
        setIp(device.ip_address || "");
        setMacError(null);
        setIpError(null);
    }, [device]);

    // Проверка при изменении MAC
    useEffect(() => {
        if (mac && !isValidMac(mac)) {
            setMacError("Некорректный MAC-адрес (пример: AA:BB:CC:DD:EE:FF)");
        } else {
            setMacError(null);
        }
    }, [mac]);

    // Проверка при изменении IP
    useEffect(() => {
        if (ip && !isValidIp(ip)) {
            setIpError("Некорректный IP-адрес (пример: 192.168.1.1)");
        } else {
            setIpError(null);
        }
    }, [ip]);

    const handleSave = () => {
        const updates: Partial<Device> = { name, mac_address: mac, ip_address: ip };

        // Для host-устройств обновляем ip_address у всех портов
        if (device.type === "host" && device.ports) {
            updates.ports = device.ports.map(port => ({
                ...port,
                ip_address: ip,
            }));
        }

        onSave(updates);
    };

    const isSaveDisabled = !!macError || !!ipError || !name || !mac || !ip;
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
                    }
                }}
            >
                Сохранить
            </Button>
        </Box>
    );
};

export default SettingsContent;
