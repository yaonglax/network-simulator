import React, { useEffect, useMemo, useState } from 'react';
import { Paper, Typography, Tooltip, IconButton, Switch as SwitchUI } from '@mui/material';
import { useNetworkStore } from '../store/network-store';
import ModalWindow from './ModalWindow';
import { DeviceEntity } from './DeviceEntity';
import { DeviceType, Host, Router, Switch, Device, Port } from '../types';
import ContextMenuPopover from './ContextMenuPopover';
import PortConnectionModal from './PortConnectionModal';
import PacketEntity from './PacketEntity';
import StartButton from './StartButton';
import { Box, styled } from '@mui/system';
import { willCreateLoop } from '../utils/loopDetection';
import { DevicesPanel } from './DevicesPanel';
import FloodNotification from './FloodNotification';
import LogWindow from './LogWindow';
import MenuIcon from '@mui/icons-material/Menu';
import SaveIcon from '@mui/icons-material/Save';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LayersClearIcon from '@mui/icons-material/LayersClear';
import ListIcon from '@mui/icons-material/List';
import { Link } from 'react-router-dom';
import useThemeStore from '@/store/themeStore';

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
    const [isLogWindowOpen, setIsLogWindowOpen] = useState(false);
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
    const { theme, toggleTheme } = useThemeStore();
    const devices = useNetworkStore((state) => state.devices);
    const connections = useNetworkStore((state) => state.connections);
    const packets = useNetworkStore((state) => state.packets);
    const activeConnections = useNetworkStore((state) => state.activeConnections);
    const isSimulationRunning = useNetworkStore((state) => state.isSimulationRunning);
    const addDevice = useNetworkStore((state) => state.addDevice);
    const startSimulation = useNetworkStore((state) => state.startSimulation);
    const clearPackets = useNetworkStore((state) => state.clearPackets);
    const clearTopology = useNetworkStore((state) => state.clearTopology);
    const logs = useNetworkStore((state) => state.logs);
    const clearLogs = useNetworkStore((state) => state.clearLogs);

    const [isPlaying, setIsPlaying] = useState(isSimulationRunning);

    const uniqueDevices = useMemo(() => {
        const seenIds = new Set<string>();
        return Object.values(devices).filter((device) => {
            if (seenIds.has(device.id)) {
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

    const connectionLines = useMemo(() => {
        return connections.map((conn) => {
            const fromDevice = devices[conn.from.deviceId];
            const toDevice = devices[conn.to.deviceId];
            if (!fromDevice || !toDevice) return null;
            const isActiveFlood = !!activeConnections[conn.id]?.floodCount;
            const stroke = '#3f51b5';
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

        const canvas = document.getElementById('network-canvas');
        if (!canvas) {
            return;
        }

        const bounds = canvas.getBoundingClientRect();
        const x = e.clientX - bounds.left;
        const y = e.clientY - bounds.top;
        setDropPosition({ x, y });
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

    const isDevicesAlreadyConnected = (deviceAId: string, deviceBId: string): boolean => {
        return connections.some(
            (conn) =>
                (conn.from.deviceId === deviceAId && conn.to.deviceId === deviceBId) ||
                (conn.from.deviceId === deviceBId && conn.to.deviceId === deviceAId)
        );
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
            if (selectedStartDevice && isDevicesAlreadyConnected(selectedStartDevice.id, device.id)) {
                setIsDrawingConn(false);
                setSelectedStartDevice(null);
                alert('Между этими устройствами уже есть соединение!');
                window.electronAPI?.focus?.forceFocus();
                return;
            }
            if (
                selectedStartDevice &&
                willCreateLoop(
                    devices,
                    connections,
                    selectedStartDevice.id,
                    device.id
                )
            ) {
                setIsDrawingConn(false);
                setSelectedStartDevice(null);
                alert('Соединение приведёт к образованию петли в топологии!');
                window.electronAPI?.focus?.forceFocus();
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

    const handleClearPackets = () => {
        clearPackets();
    };

    const handleClearTopology = () => {
        clearTopology();
        clearPackets();
    };

    const handleToggleLogWindow = () => {
        setIsLogWindowOpen((prev) => !prev);
    };
    const MaterialUISwitch = styled(SwitchUI)({
        width: 52,
        height: 32,
        padding: 7,
        '& .MuiSwitch-switchBase': {
            margin: 1,
            padding: 0,
            transform: 'translateX(6px)',
            transition: 'transform 0.3s ease-in-out, color 0.3s ease-in-out',
            '&.Mui-checked': {
                color: 'var(--contrast-white)',
                transform: 'translateX(22px)',
                '& .MuiSwitch-thumb:before': {
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 18 18"><path fill="${encodeURIComponent(
                        '#fff',
                    )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
                },
                '& + .MuiSwitch-track': {
                    opacity: 1,
                    backgroundColor: 'var(--accent-purple)',
                    transition: 'transform 0.3s ease-in-out, color 0.3s ease-in-out',
                },
            },
        },
        '& .MuiSwitch-thumb': {
            backgroundColor: 'var(--highlight-purple)',
            width: 24,
            height: 24,
            marginTop: '3px',
            transition: 'transform 0.3s ease-in-out, color 0.3s ease-in-out',
            '&::before': {
                content: "''",
                position: 'absolute',
                width: '100%',
                height: '100%',
                left: 0,
                top: 0,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="18" width="18" viewBox="0 0 18 18"><path fill="${encodeURIComponent(
                    '#fff',
                )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
            },
        },
        '& .MuiSwitch-track': {
            opacity: 1,
            backgroundColor: 'var(--detail-gray)',
            borderRadius: 20 / 2,
            transition: 'transform 0.3s ease-in-out, color 0.3s ease-in-out',
        },
    });
    return (
        <>

            <Box
                id="navbar"
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '60px',
                    backgroundColor: 'var(--bg-dark-gray)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 20px',
                    zIndex: 1100,
                    borderBottom: '1px solid var(--detail-gray)',
                }}
            >
                <Box sx={{ width: 'auto', display: 'flex', gap: '20px' }}>
                    <Typography variant="h5" color="var(--contrast-white)" fontWeight={700}>
                        NETSIM
                    </Typography>
                    <MaterialUISwitch
                        checked={theme === 'dark'}
                        onChange={toggleTheme}
                        aria-label="Переключить тему"
                    />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="Вернуться к теории">
                        <Link to="/theory">
                            <IconButton
                                sx={{
                                    color: 'var(--contrast-white)',
                                    marginRight: '10px',
                                    '&:hover': {
                                        color: 'var(--highlight-purple)',
                                        transition: 'color 0.3s ease',
                                    },
                                }}
                            >
                                <MenuIcon />
                            </IconButton>
                        </Link>
                    </Tooltip>
                    <Tooltip title="Загрузить файл">
                        <IconButton
                            onClick={async () => {
                                const { handleLoad } = await import('./SaveLoadControls');
                                handleLoad();
                            }}
                            sx={{
                                color: 'var(--contrast-white)',
                                marginRight: '10px',
                                '&:hover': {
                                    color: 'var(--highlight-purple)',
                                    transition: 'color 0.3s ease',
                                },
                            }}
                        >
                            <UploadFileIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Сохранить файл">
                        <IconButton
                            onClick={async () => {
                                const { handleSave } = await import('./SaveLoadControls');
                                handleSave();
                            }}
                            sx={{
                                color: 'var(--contrast-white)',
                                marginRight: '10px',
                                '&:hover': {
                                    color: 'var(--highlight-purple)',
                                    transition: 'color 0.3s ease',
                                },
                            }}
                        >
                            <SaveIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Очистить пакеты">
                        <IconButton
                            onClick={handleClearPackets}
                            disabled={isSimulationRunning}
                            sx={{
                                color: 'var(--contrast-white)',
                                marginRight: '10px',
                                '&:hover': {
                                    color: 'var(--highlight-purple)',
                                    transition: 'color 0.3s ease',
                                },
                            }}
                        >
                            <DeleteSweepIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Очистить топологию">
                        <IconButton
                            onClick={handleClearTopology}
                            disabled={isSimulationRunning}
                            sx={{
                                color: 'var(--contrast-white)',
                                marginRight: '10px',
                                '&:hover': {
                                    color: 'var(--highlight-purple)',
                                    transition: 'color 0.3s ease',
                                },
                            }}
                        >
                            <LayersClearIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isLogWindowOpen ? 'Скрыть логи' : 'Показать логи'}>
                        <IconButton
                            onClick={handleToggleLogWindow}
                            sx={{
                                color: 'var(--contrast-white)',
                                marginRight: '10px',
                                '&:hover': {
                                    color: 'var(--highlight-purple)',
                                    transition: 'color 0.3s ease',
                                },
                            }}
                        >
                            <ListIcon />
                        </IconButton>
                    </Tooltip>
                    <StartButton isPlaying={isPlaying} onToggle={handleToggleSimulation} />
                </Box>
            </Box>
            <Paper
                id="network-canvas"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onContextMenu={(e) => e.preventDefault()}
                onMouseMove={handleMouseMove}
                sx={{
                    flexGrow: 1,
                    height: '700px',
                    position: 'relative',
                    bgcolor: 'var(--detail-gray)',
                    border: 'none',
                    borderRadius: '0.5rem',
                    overflow: 'hidden',
                    zIndex: 1,
                    width: '95%',
                    marginLeft: '60px',
                    marginTop: '80px',
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
                        isDraggable={!isSimulationRunning}
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
                <ModalWindow
                    modalOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSubmit={handleModalConfirm}
                    deviceType={deviceType}
                />
                <ContextMenuPopover
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

                {Object.values(packets).map((packet) => (
                    <PacketEntity
                        key={packet.id}
                        packetId={packet.id}
                        isPlaying={isPlaying}
                    />
                ))}
                <DevicesPanel />
                <FloodNotification />
            </Paper>
            {isLogWindowOpen && (
                <LogWindow logs={logs} onClose={() => setIsLogWindowOpen(false)} />
            )}
        </>
    );
};

export default NetworkCanvas;