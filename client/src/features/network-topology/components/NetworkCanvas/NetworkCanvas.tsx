
import React, { useEffect, useMemo, useState } from 'react';
import { Paper, Button } from '@mui/material';
import { useNetworkStore } from '../../store/network-store';
import ModalWindow from '../ModalWindow/ModalWindow';
import { DeviceEntity } from '../DeviceEntity/DeviceEntity';
import { DeviceType, Host, Router, Switch, Device, Port } from '../../types';
import PortsPopover from '@/features/network-topology/components/ContextMenuPopover/ContextMenuPopover';
import PortConnectionModal from '@/features/network-topology/components/PortConnectionModal/PortConnectionModal';
import PacketEntity from '../PacketEntity/PacketEntity';
import StartButton from '../StartButton';

export const NetworkCanvas = () => {

    interface LineCoords {
        startX: number;
        startY: number;
        endX: number;
        endY: number;
        id: string;
        stroke: string;
    }

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPortsModalOpen, setIsPortsModalOpen] = useState(false);
    const [isPortsConnModalOpen, setIsPortsConnModalOpen] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
    const [dropPosition, setDropPosition] = useState({ x: 0, y: 0 });
    const [deviceType, setDeviceType] = useState<DeviceType | null>(null);
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [isDrawingConn, setIsDrawingConn] = useState(false);
    const [mouseCoord, setMouseCoord] = useState({ mouseX: 0, mouseY: 0 });
    const [selectedStartDevice, setSelectedStartDevice] = useState<Device | null>(null);
    const [selectedEndDevice, setSelectedEndDevice] = useState<Device | null>(null);
    const [selectedStartPort, setSelectedStartPort] = useState<Port | null>(null);
    const [selectedEndPort, setSelectedEndPort] = useState<Port | null>(null);
    const [lineCoord, setLineCoord] = useState<LineCoords>({
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        id: '',
        stroke: '#3f51b5',
    });
    const [deviceRects, setDeviceRects] = useState<Record<string, DOMRect>>({});

    // zustand store
    const devices = useNetworkStore((state) => state.devices);
    const connections = useNetworkStore((state) => state.connections);
    const packets = useNetworkStore((state) => state.packets);
    const activeConnections = useNetworkStore((state) => state.activeConnections);
    const isSimulationRunning = useNetworkStore((state) => state.isSimulationRunning);
    const addDevice = useNetworkStore((state) => state.addDevice);
    const startSimulation = useNetworkStore((state) => state.startSimulation);
    const clearPackets = useNetworkStore((state) => state.clearPackets);

    const [isPlaying, setIsPlaying] = useState(isSimulationRunning);

    // Уникальные устройства (без дубликатов)
    const uniqueDevices = useMemo(() => {
        const seenIds = new Set<string>();
        return Object.values(devices).filter((device) => {
            if (seenIds.has(device.id)) {
                console.warn(`Duplicate device ID found: ${device.id}`);
                return false;
            }
            seenIds.add(device.id);
            return true;
        });
    }, [devices]);

    useEffect(() => {
        setIsPlaying(isSimulationRunning);
    }, [isSimulationRunning]);

    useEffect(() => {
        const rects: Record<string, DOMRect> = {};
        uniqueDevices.forEach((device) => {
            const element = document.getElementById(`device-${device.id}`);
            if (element) {
                rects[device.id] = element.getBoundingClientRect();
            }
        });
        setDeviceRects(rects);
    }, [uniqueDevices]);

    // Линии соединений
    const connectionLines = useMemo(() => {
        return connections.map((conn) => {
            const fromDevice = devices[conn.from.deviceId];
            const toDevice = devices[conn.to.deviceId];
            if (!fromDevice || !toDevice) return null;
            const isActiveFlood = !!activeConnections[conn.id]?.floodCount;
            const stroke = isActiveFlood ? 'black' : '#3f51b5';
            return {
                id: conn.id,
                startX: fromDevice.x + 25,
                startY: fromDevice.y + 25,
                endX: toDevice.x + 25,
                endY: toDevice.y + 25,
                stroke,
            };
        }).filter(Boolean) as LineCoords[];
    }, [connections, devices, activeConnections]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('application/reactflow/device');
        if (type === 'move') return;

        const bounds = e.currentTarget.getBoundingClientRect();
        setDropPosition({
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top,
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
        setMouseCoord({ mouseX: e.clientX, mouseY: e.clientY });
        if (isDrawingConn) {
            setLineCoord((prev) => ({
                ...prev,
                endX: e.clientX,
                endY: e.clientY,
            }));
        }
    };

    const handleDoubleClick = (e: React.MouseEvent<HTMLElement>, device: Device) => {
        e.preventDefault();
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        if (!isDrawingConn) {
            setSelectedStartDevice(device);
            setIsDrawingConn(true);
            setLineCoord({
                startX: centerX,
                startY: centerY,
                endX: centerX,
                endY: centerY,
                id: '',
                stroke: '#3f51b5',
            });
        } else {
            if (device.id === selectedStartDevice?.id) {
                setIsDrawingConn(false);
                setSelectedStartDevice(null);
                return;
            }

            const freePorts = getFreePorts(device.id);
            if (freePorts.length === 0) {
                setIsDrawingConn(false);
                setSelectedStartDevice(null);
                alert('Все порты заняты!');
                window.electronAPI?.focus?.forceFocus();
                return;
            }

            if (selectedStartDevice?.type === 'host' && device.type === 'host') {
                setIsDrawingConn(false);
                setSelectedStartDevice(null);
                alert('Нельзя соединять два хоста напрямую');
                window.electronAPI?.focus?.forceFocus();
                return;
            }

            setSelectedEndDevice(device);
            setIsDrawingConn(false);
            setIsPortsConnModalOpen(true);

            setLineCoord((prev) => ({
                ...prev,
                endX: centerX,
                endY: centerY,
            }));
        }
    };

    const getFreePorts = (deviceId: string): Port[] => {
        const device = devices[deviceId];
        if (!device?.ports) return [];
        return device.ports.filter((port) => !port.connectedTo);
    };

    const handleModalConfirm = (formData: any) => {
        if (!deviceType) return;

        const baseDevice = {
            id: `device-${Date.now()}`,
            name: formData.name || `New ${deviceType}`,
            x: dropPosition.x,
            y: dropPosition.y,
            ports: formData.ports || [],
        };

        switch (deviceType) {
            case 'host':
                const host: Host = {
                    ...baseDevice,
                    type: 'host',
                    ip_address: formData.ip_address || '192.168.0.1',
                    mac_address: formData.mac_address || 'AA:BB:CC:DD:EE:FF',
                    gateway: formData.gateway || '192.168.0.1',
                    icon: 'src/assets/entities/desktop.png',
                };
                addDevice(host);
                break;

            case 'router':
                const router: Router = {
                    ...baseDevice,
                    type: 'router',
                    routing_table: [],
                    icon: '../../../assets/entities/wireless-router.png',
                };
                addDevice(router);
                break;

            case 'switch':
                const switchDevice: Switch = {
                    ...baseDevice,
                    type: 'switch',
                    mac_table: {},
                    icon: '../../../assets/entities/hub.png',
                };
                addDevice(switchDevice);
                break;
        }

        setIsModalOpen(false);
    };

    const handlePortsConnected = () => {
        if (selectedStartDevice && selectedEndDevice && selectedStartPort && selectedEndPort) {
            useNetworkStore.getState().connectPorts(
                selectedStartPort,
                selectedEndPort
            );
        }

        setIsPortsConnModalOpen(false);
        setSelectedStartDevice(null);
        setSelectedEndDevice(null);
        setLineCoord({
            startX: 0,
            startY: 0,
            endX: 0,
            endY: 0,
            id: '',
            stroke: '#3f51b5',
        });
    };

    const handleToggleSimulation = () => {
        if (!isPlaying) {
            setIsPlaying(true);
            startSimulation();
        } else {
            setIsPlaying(false);
        }
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
                    zIndex: 1,
                }}
            >
                {connectionLines.map((line) => (
                    <line
                        key={line.id}
                        x1={line.startX}
                        y1={line.startY}
                        x2={line.endX}
                        y2={line.endY}
                        stroke={line.stroke}
                        strokeWidth="2"
                    />
                ))}
            </svg>

            {uniqueDevices.map((device) => (
                <DeviceEntity
                    key={device.id}
                    device={device}
                    onContextMenu={() => handleDeviceContextMenu(device)}
                    handlePopoverOpen={(e) => handlePopoverOpen(e, device)}
                    handlePopoverClose={handlePopoverClose}
                    onDoubleClick={(e) => handleDoubleClick(e, device)}
                />
            ))}

            {isDrawingConn && (
                <svg
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        pointerEvents: 'none',
                        zIndex: 10,
                    }}
                >
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

            <StartButton
                isPlaying={isPlaying}
                onToggle={handleToggleSimulation}
            />
            <Button
                variant="contained"
                onClick={() => clearPackets()}
                sx={{ position: 'absolute', bottom: 60, right: 20, zIndex: 1000 }}
            >
                Очистить пакеты
            </Button>
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
                    onClose={() => {
                        setIsPortsConnModalOpen(false);
                    }}
                    onConnect={() => {
                        handlePortsConnected();
                    }}
                    open={isPortsConnModalOpen}
                    deviceIdStart={selectedStartDevice.id}
                    deviceIdEnd={selectedEndDevice.id}
                />
            )}
            {/* Теперь отображаем все пакеты, включая flood */}
            {Object.values(packets).map((packet) => (
                <PacketEntity
                    key={packet.id}
                    packetId={packet.id}
                    isPlaying={isPlaying}
                />
            ))}
        </Paper>
    );
};

export default NetworkCanvas;
