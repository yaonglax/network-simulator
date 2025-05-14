import React, { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { Device } from "@/features/network-topology/types";

interface SettingsContentProps {
    device: Device;
    onSave: (updates: Partial<Device>) => void;
}

const SettingsContent: React.FC<SettingsContentProps> = ({ device, onSave }) => {
    const [name, setName] = useState(device.name);
    const [mac, setMac] = useState(device.mac_address || "");
    const [ip, setIp] = useState(device.ip_address || "")

    const handleSave = () => {
        onSave({ name, mac_address: mac, ip_address: ip });
    };

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="h6">Настройки устройства</Typography>
            <TextField
                label="Имя устройства"
                value={name}
                onChange={e => setName(e.target.value)}
                size="small"
            />
            <TextField
                label="MAC-адрес"
                value={mac}
                onChange={e => setMac(e.target.value)}
                size="small"
            />
            <TextField
                label="IP-адрес"
                value={ip}
                onChange={e => setIp(e.target.value)}
                size="small"
            />
            <Button variant="contained" onClick={handleSave}>
                Сохранить
            </Button>
        </Box>
    );
};

export default SettingsContent;
