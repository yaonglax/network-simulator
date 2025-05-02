import React, { useEffect, useMemo, useState } from 'react';
import { Paper } from '@mui/material';
import { useNetworkStore } from '../../store/network-store';
import { ModalWindow, SaveLoadControls } from '@/shared/ui';
import { DeviceEntity } from '../DeviceEntity/DeviceEntity';
import { DeviceType, Host, Router, Switch, Device } from '../../types';
import PortsPopover from '@/shared/ui/PortsPopover/PortsPopover';
import { fileStorage } from '../../store/electronStorage';
import PortConnectionModal from '@/shared/ui/PortConnectionModal/PortConnectionModal';



export const NetworkCanvas = () => {

    interface LineCoords {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
    }

    const [forceUpdate, setForceUpdate] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPortsModalOpen, setIsPortsModalOpen] = useState(false)
    const [isPortsConnModalOpen, setIsPortsConnModalOpen] = useState(false)
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [dropPosition, setDropPosition] = useState({ x: 0, y: 0 });
    const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [isDrawingConn, setIsDrawingConn] = useState(false)
    const [mouseCoord, setMouseCoord] = useState({ mouseX: 0, mouseY: 0 })
    const [selectedStartDevice, setSelectedStartDevice] = useState<Device | null>(null)
    const [selectedEndDevice, setSelectedEndDevice] = useState<Device | null>(null)
    const [lineCoord, setLineCoord] = useState<LineCoords>({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0
    });
    const connections = useNetworkStore((state) => state.connections);
    const addDevice = useNetworkStore((state) => state.addDevice);
    const devices = useNetworkStore((state) => state.devices);
    const [deviceRects, setDeviceRects] = useState<Record<string, DOMRect>>({});
    const storeConnections = useNetworkStore((state) => state.connections);

    useEffect(() => {
        const rects: Record<string, DOMRect> = {};
        Object.values(devices).forEach(device => {
            const element = document.getElementById(`device-${device.id}`);
            if (element) {
                rects[device.id] = element.getBoundingClientRect();
            }
        });
        setDeviceRects(rects);
    }, [devices, forceUpdate]);



    const connectionLines = useMemo(() => {
        return connections.map(conn => {
            const fromDevice = devices[conn.from.deviceId];
            const toDevice = devices[conn.to.deviceId];

            if (!fromDevice || !toDevice || fromDevice.x === undefined || fromDevice.y === undefined || toDevice.x === undefined || toDevice.y === undefined) return null;

            return {
                id: conn.id,
                startX: fromDevice.x + 25,
                startY: fromDevice.y + 25,
                endX: toDevice.x + 25,
                endY: toDevice.y + 25
            };
        }).filter(Boolean) as Array<LineCoords & { id: string }>;
    }, [connections, devices]);

    useEffect(() => {
        const unsubscribe = useNetworkStore.subscribe(
            (state) => {
                console.log("Current devices:", Object.values(state.devices));
                setForceUpdate(prev => !prev);
            }
        );
        return () => unsubscribe();
    }, []);


    useEffect(() => {
        if (!isDrawingConn) return;

        const handleMouseMove = (e: MouseEvent) => {
            setLineCoord(prev => ({
                ...prev,
                endX: e.clientX,
                endY: e.clientY
            }));
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isDrawingConn]);

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

    const handleDeviceContextMenu = (device: Device) => {
        setSelectedDevice(device);
        setIsPortsModalOpen(true);

    };

    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>, device: Device) => {
        setAnchorEl(event.currentTarget);
        setSelectedDevice(device);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        setMouseCoord({ mouseX: e.clientX, mouseY: e.clientY })
    }

    const handleDoubleClick = (e: React.MouseEvent<HTMLElement>, device: Device) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        if (!isDrawingConn) {
            // Первый клик - начало линии
            setSelectedStartDevice(device);
            setIsDrawingConn(true);
            setLineCoord({
                startX: centerX,
                startY: centerY,
                endX: centerX,
                endY: centerY
            });
        } else {
            // Второй клик - завершение линии
            if (device.id === selectedStartDevice?.id) {
                // Клик на то же устройство - отмена
                setIsDrawingConn(false);
                setSelectedStartDevice(null);
                return;
            }

            setSelectedEndDevice(device);
            setIsDrawingConn(false);

            // Сначала открываем модальное окно
            setIsPortsConnModalOpen(true);

            // Затем обновляем линию (но не добавляем в connections пока не подтвердят в модалке)
            setLineCoord(prev => ({
                ...prev,
                endX: centerX,
                endY: centerY
            }));
        }
    };

    const handleModalConfirm = (formData: any) => {
        if (!deviceType) return;

        const baseDevice = {
            id: `device-${Date.now()}`,
            name: formData.name || `New ${deviceType}`,
            x: dropPosition.x,
            y: dropPosition.y,
            ports: formData.ports || []
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
                    routing_table: [],
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
    const handlePortsConnected = () => {
        if (selectedStartDevice && selectedEndDevice) {
            // Добавляем соединение в хранилище
            useNetworkStore.getState().connectPorts(
                selectedStartDevice.ports[0], // Нужно выбрать конкретный порт
                selectedEndDevice.ports[0]    // Нужно выбрать конкретный порт
            );
        }

        // Сбрасываем временные состояния
        setIsPortsConnModalOpen(false);
        setSelectedStartDevice(null);
        setSelectedEndDevice(null);
        setLineCoord({
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0
        });
    };
    return (
        <Paper
            id="network-canvas"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onContextMenu={(e) => e.preventDefault()}
            onMouseMove={handleMouseMove}

            sx={{
                flexGrow: 1,
                height: '600px',
                position: 'relative',
                bgcolor: 'background.default',
                border: '2px dashed #ccc',
                overflow: 'hidden',
                zIndex: 1,
            }}
        >


            <svg
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    pointerEvents: 'none',
                    zIndex: 1
                }}
            >
                {connectionLines.map(conn => (
                    <line
                        key={conn.id}
                        x1={conn.startX}
                        y1={conn.startY}
                        x2={conn.endX}
                        y2={conn.endY}
                        stroke="#3f51b5"
                        strokeWidth="2"
                    />
                ))}
            </svg>

            {/* Затем рисуем устройства поверх соединений */}
            {Object.values(devices).map((device) => (
                <DeviceEntity key={device.id} device={device} onContextMenu={() => handleDeviceContextMenu(device)} handlePopoverOpen={(e) => handlePopoverOpen(e, device)}
                    handlePopoverClose={handlePopoverClose} onDoubleClick={(e) => handleDoubleClick(e, device)} />
            ))}

            {/* Временная линия соединения (при рисовании) */}
            {isDrawingConn && (
                <svg style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    pointerEvents: 'none',
                    zIndex: 10
                }}>
                    <line
                        x1={lineCoord.startX}
                        y1={lineCoord.startY}
                        x2={lineCoord.endX}
                        y2={lineCoord.endY}
                        stroke="#3f51b5"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                    />
                </svg>
            )}


            <ModalWindow
                modalOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleModalConfirm}
                deviceType={deviceType}

            />
            <PortsPopover
                device={selectedDevice}
                onClose={() => setSelectedDevice(null)}
                anchorEl={anchorEl}
                setAnchorEl={setAnchorEl}
            />

            {selectedStartDevice && selectedEndDevice && (
                <PortConnectionModal
                    onClose={() => setIsPortsConnModalOpen(false)}
                    onConnect={handlePortsConnected}
                    open={isPortsConnModalOpen}
                    deviceIdStart={selectedStartDevice.id}
                    deviceIdEnd={selectedEndDevice.id}
                />
            )}

        </Paper>
    );
};