import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    MenuItem
} from '@mui/material';
import { DeviceType } from '@/features/network-topology/types';

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
    deviceType
}) => {
    const [formData, setFormData] = useState({
        name: '',
        ip_address: '',
        mac_address: '',
        gateway: '',
        port1Type: 'access' as 'trunk' | 'access',
        port2Type: 'access' as 'trunk' | 'access'
    });

    useEffect(() => {
        if (modalOpen) {
            setFormData({
                name: '',
                ip_address: '192.168.0.1',
                mac_address: 'AA:BB:CC:DD:EE:FF',
                gateway: '192.168.0.1',
                port1Type: 'access',
                port2Type: 'access'
            });
        }
    }, [modalOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const name = e.target.name as keyof typeof formData;
        const value = e.target.value as 'trunk' | 'access';
        if (name) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    const renderDeviceSpecificFields = () => {
        switch (deviceType) {
            case 'host':
                return (
                    <>
                        <TextField
                            margin="dense"
                            name="ip_address"
                            label="IP Address"
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
                );
            case 'switch':
                return (
                    <>
                        <TextField
                            select
                            margin="dense"
                            name="port1Type"
                            label="Port 1 Type"
                            fullWidth
                            value={formData.port1Type}
                            onChange={handleSelectChange}
                        >
                            <MenuItem value="trunk">Trunk</MenuItem>
                            <MenuItem value="access">Access</MenuItem>
                        </TextField>
                        <TextField
                            select
                            margin="dense"
                            name="port2Type"
                            label="Port 2 Type"
                            fullWidth
                            value={formData.port2Type}
                            onChange={handleSelectChange}
                        >
                            <MenuItem value="trunk">Trunk</MenuItem>
                            <MenuItem value="access">Access</MenuItem>
                        </TextField>
                    </>
                );
            case 'router':
                return (
                    <TextField
                        margin="dense"
                        name="routing_table"
                        label="Routing Table (JSON)"
                        fullWidth
                        helperText="Enter routing table in JSON format"
                    />
                );
            default:
                return null;
        }
    };

    return (
        <Dialog
            open={modalOpen}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    Add New {deviceType?.toUpperCase() || 'Device'}
                </DialogTitle>
                <DialogContent dividers>
                    <TextField
                        autoFocus
                        margin="dense"
                        name="name"
                        label="Device Name"
                        fullWidth
                        value={formData.name}
                        onChange={handleChange}
                    />
                    {renderDeviceSpecificFields()}
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancel</Button>
                    <Button type="submit" variant="contained">Add Device</Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};

export default ModalWindow