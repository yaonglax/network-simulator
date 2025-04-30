import React, { useEffect, useState } from 'react';
import { Box, Paper } from '@mui/material';
import { useNetworkStore } from '../../store/network-store';
import { ModalWindow, SaveLoadControls } from '@/shared/ui';
import { DeviceEntity } from '../DeviceEntity/DeviceEntity';
import { DeviceType, createHost, Host, Router, Switch, Device } from '../../types';

export const NetworkCanvas = () => {

    useEffect(() => {
        const unsubscribe = useNetworkStore.subscribe(
            (state) => {
                console.log("Current devices:", Object.values(state.devices));
            }
        );

        return () => unsubscribe();
    }, []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [dropPosition, setDropPosition] = useState({ x: 0, y: 0 });
    const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
    const addDevice = useNetworkStore((state) => state.addDevice);
    const devices = useNetworkStore((state) => state.devices);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/reactflow/device');
        if (type === 'move') return;

        const bounds = e.currentTarget.getBoundingClientRect();
        setDropPosition({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top
        });
        setDeviceType(type.toLowerCase() as DeviceType);
        setIsModalOpen(true);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleModalConfirm = (formData: Record<string, any>) => {
        if (!deviceType) return;

        const baseDevice = {
            id: `device-${Date.now()}`,
            name: formData.name || `New ${deviceType}`,
            x: dropPosition.x,
            y: dropPosition.y,
            ports: [
                {
                    id: "eth0",
                    name: "Ethernet 0",
                    deviceId: `device-${Date.now()}`,
                    type: formData.port1Type || 'access',
                    ...(formData.port1Type === "trunk" ?
                        { allowed_vlans: [1, 2] } :
                        { vlan_id: 1 }
                    )
                },
                {
                    id: "eth1",
                    name: "Ethernet 1",
                    deviceId: `device-${Date.now()}`,
                    type: formData.port2Type || 'access',
                    ...(formData.port2Type === "trunk" ?
                        { allowed_vlans: [1, 2] } :
                        { vlan_id: 1 }
                    )
                }
            ],
        };

        switch (deviceType) {
            case 'host':
                const host: Host = {
                    ...baseDevice,
                    type: 'host',
                    ip_address: formData.ip_address || '192.168.0.1',
                    mac_address: formData.mac_address || 'AA:BB:CC:DD:EE:FF',
                    gateway: formData.gateway || '192.168.0.1',
                    icon: "src/assets/entities/desktop.png"
                };
                addDevice(host);
                break;

            case 'router':
                const router: Router = {
                    ...baseDevice,
                    type: 'router',
                    routing_table: formData.routing_table ? JSON.parse(formData.routing_table) : [],
                    icon: "../../../assets/entities/wireless-router.png"
                };
                addDevice(router);
                break;

            case 'switch':
                const switchDevice: Switch = {
                    ...baseDevice,
                    type: 'switch',
                    mac_table: {},
                    icon: "../../../assets/entities/hub.png"
                };
                addDevice(switchDevice);
                break;
        }

        setIsModalOpen(false);
    };

    return (
        <Paper
            id="network-canvas"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            sx={{
                flexGrow: 1,
                height: '600px',
                position: 'relative',
                bgcolor: 'background.default',
                border: '2px dashed #ccc', // Визуальные границы
                overflow: 'hidden', // Предотвращаем выход за границы
            }}
        >
            {Object.values(devices).map((device) => (
                <DeviceEntity key={device.id} device={device} />
            ))}

            <ModalWindow
                modalOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalConfirm}
                deviceType={deviceType}
            />
            <SaveLoadControls />
        </Paper>
    );
};