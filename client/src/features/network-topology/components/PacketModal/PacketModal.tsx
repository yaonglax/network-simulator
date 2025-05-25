
import { Box, Button, MenuItem, MenuList, TextField, Typography, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { Device, NetworkPacket } from '../../types';
import { useState } from 'react';
import { useNetworkStore } from '../../store/network-store';

interface PacketModalProps {
    device: Device;
    handlePopoverClose: () => void;
}

type PacketType = 'normal' | 'ARP' | 'PING';

const PacketModal = ({ device, handlePopoverClose }: PacketModalProps) => {
    const [destMAC, setDestMAC] = useState('');
    const [payload, setPayload] = useState('');
    const [macError, setMacError] = useState<string | null>(null);
    const [ipError, setIpError] = useState<string | null>(null);
    const [selectedPortId, setSelectedPortId] = useState<string>('');
    const [packetType, setPacketType] = useState<PacketType>('normal');
    const [arpTargetIp, setArpTargetIp] = useState('');
    const [pingTargetIp, setPingTargetIp] = useState('');
    const { addPacket, devices, sendPing } = useNetworkStore();

    const formStyles = {
        '& .MuiInputBase-input': {
            color: 'white',
        },
        '& .MuiOutlinedInput-root': {
            '& fieldset': {
                borderColor: 'rgba(229, 231, 235, 0.5)',
            },
            '&:hover fieldset': {
                borderColor: '#8053b0',
            },
            '&.Mui-focused fieldset': {
                borderColor: '#8053b0',
            },
        },
        '& .MuiInputLabel-root': {
            color: 'rgba(229, 231, 235, 0.5)',
            '&.Mui-focused': {
                color: '#8053b0',
            },
        },
        '& .MuiFormHelperText-root': {
            color: 'rgba(229, 231, 235, 0.5)',
            '&.Mui-error': {
                color: '#f44336',
            },
        },
        '& .MuiRadio-root': {
            color: 'rgba(229, 231, 235, 0.5)',
            '&.Mui-checked': {
                color: '#8053b0',
            },
        },
        '& .MuiMenuItem-root': {
            color: 'white',
            '&.Mui-selected': {
                backgroundColor: '#8053b0',
                '&:hover': {
                    backgroundColor: '#8053b0',
                },
            },
            '&:hover': {
                backgroundColor: '#8053b080',
            },
        },
    };

    const connectedPorts =
        device.ports?.filter(
            (port) => port.connectedTo?.deviceId && devices[port.connectedTo.deviceId]
        ) ?? [];

    const validateMac = (mac: string): boolean => {
        const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macRegex.test(mac) || mac === 'FF:FF:FF:FF:FF:FF';
    };

    const validateIp = (ip: string): boolean => {
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return ipRegex.test(ip);
    };

    // Проверка: нельзя отправлять пакет самому себе (MAC)
    const isSelfMac = () => {
        if (!selectedPortId) return false;
        const sourcePort = device.ports?.find((p) => p.id === selectedPortId);
        const sourceMAC = device.type === 'host' ? device.mac_address : sourcePort?.mac_address ?? '';
        return destMAC.toLowerCase() === sourceMAC?.toLowerCase();
    };

    // Проверка: нельзя отправлять пакет самому себе (IP)
    const isSelfIp = (targetIp: string) => {
        return device.ip_address && targetIp === device.ip_address;
    };

    const handleMacChange = (value: string) => {
        setDestMAC(value);
        if (!validateMac(value)) {
            setMacError('Неверный формат MAC-адреса');
        } else if (isSelfMac()) {
            setMacError('Нельзя отправлять пакет самому себе (MAC совпадает)');
        } else {
            setMacError(null);
        }
    };

    const handleArpIpChange = (value: string) => {
        setArpTargetIp(value);
        if (!validateIp(value)) {
            setIpError('Неверный формат IP-адреса');
        } else if (isSelfIp(value)) {
            setIpError('Нельзя отправлять ARP-запрос самому себе');
        } else {
            setIpError(null);
        }
    };

    const handlePingIpChange = (value: string) => {
        setPingTargetIp(value);
        if (!validateIp(value)) {
            setIpError('Неверный формат IP-адреса');
        } else if (isSelfIp(value)) {
            setIpError('Нельзя отправлять ping самому себе');
        } else {
            setIpError(null);
        }
    };

    const handleSendPacket = () => {
        // Получаем все активные порты хоста
        const activePorts = device.ports.filter((p) => p.active);

        if (activePorts.length === 0) {
            alert("У хоста нет активных портов для отправки пакета.");
            return;
        }

        if (packetType === "PING") {
            // Для ping используем sendPing (он сам формирует пакет)
            // Отправляем ping с каждого активного порта (если нужно)
            activePorts.forEach(() => {
                sendPing(device.id, pingTargetIp);
            });
            handlePopoverClose();
            return;
        }

        if (packetType === "ARP") {
            // ARP-запрос — широковещательный MAC
            activePorts.forEach((port) => {
                const arpPacket: NetworkPacket = {
                    id: `arp-${Date.now()}-${port.id}`,
                    sourceDeviceId: device.id,
                    sourcePortId: port.id,
                    destMAC: "FF:FF:FF:FF:FF:FF",
                    sourceMAC: device.mac_address,
                    vlanId: port.isVlanEnabled ? port.accessVlan : undefined,
                    payload: JSON.stringify({
                        type: "ARP-REQUEST",
                        targetIp: arpTargetIp,
                        senderIp: device.ip_address,
                    }),
                    path: [],
                    currentHop: 0,
                    x: device.x ?? 0,
                    y: device.y ?? 0,
                    isFlooded: true,
                    isResponse: false,
                    ttl: 64,
                    type: "ARP",
                    visited: new Set<string>(),
                    isProcessed: false,
                    isPlaying: false,
                };
                addPacket(arpPacket);
            });
            handlePopoverClose();
            return;
        }

        // Обычный DATA-пакет (unicast/broadcast)
        activePorts.forEach((port) => {
            const dataPacket: NetworkPacket = {
                id: `data-${Date.now()}-${port.id}`,
                sourceDeviceId: device.id,
                sourcePortId: port.id,
                destMAC: destMAC,
                sourceMAC: device.mac_address,
                vlanId: port.isVlanEnabled ? port.accessVlan : undefined,
                payload: payload,
                path: [],
                currentHop: 0,
                x: device.x ?? 0,
                y: device.y ?? 0,
                isFlooded: destMAC === "FF:FF:FF:FF:FF:FF",
                isResponse: false,
                ttl: 64,
                type: "DATA",
                visited: new Set<string>(),
                isProcessed: false,
                isPlaying: false,
            };
            addPacket(dataPacket);
        });
        handlePopoverClose();
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            width: 500,
            backgroundColor: '#181C22',
            color: 'white',
            ...formStyles,
            pr: 4,
        }}>
            <Typography variant='h6' sx={{ color: 'white' }}>Отправка пакета</Typography>

            <RadioGroup
                row
                value={packetType}
                onChange={(e) => setPacketType(e.target.value as PacketType)}
                sx={{ mb: 2 }}
            >
                <FormControlLabel
                    value="normal"
                    control={<Radio />}
                    label="Обычный пакет"
                    sx={{ color: 'rgba(229, 231, 235, 0.5)' }}
                />
                <FormControlLabel
                    value="ARP"
                    control={<Radio />}
                    label="ARP-запрос"
                    sx={{ color: 'rgba(229, 231, 235, 0.5)' }}
                />
                <FormControlLabel
                    value="PING"
                    control={<Radio />}
                    label="Ping"
                    sx={{ color: 'rgba(229, 231, 235, 0.5)' }}
                />
            </RadioGroup>

            <Box>

            </Box>

            {packetType === 'normal' && (
                <TextField
                    label='MAC назначения'
                    value={destMAC}
                    onChange={(e) => handleMacChange(e.target.value)}
                    error={!!macError}
                    helperText={macError}
                    size='small'
                    placeholder='FF:FF:FF:FF:FF:FF для широковещания'
                    fullWidth
                    sx={formStyles}
                />
            )}

            {packetType === 'ARP' && (
                <TextField
                    label="IP-адрес, который ищем (target IP)"
                    value={arpTargetIp}
                    onChange={(e) => handleArpIpChange(e.target.value)}
                    error={!!ipError}
                    helperText={ipError}
                    size="small"
                    required
                    fullWidth
                    sx={formStyles}
                />
            )}

            {packetType === 'PING' && (
                <TextField
                    label='IP-адрес назначения'
                    value={pingTargetIp}
                    onChange={(e) => handlePingIpChange(e.target.value)}
                    error={!!ipError}
                    helperText={ipError}
                    size='small'
                    placeholder='Например, 192.168.1.100'
                    fullWidth
                    sx={formStyles}
                />
            )}

            <TextField
                label={
                    packetType === 'ARP'
                        ? 'ARP payload (автоматически)'
                        : packetType === 'PING'
                            ? 'Ping payload (автоматически)'
                            : 'Содержимое пакета'
                }
                value={packetType === 'ARP' || packetType === 'PING' ? '' : payload}
                onChange={(e) => setPayload(e.target.value)}
                multiline
                rows={3}
                disabled={packetType === 'ARP' || packetType === 'PING'}
                fullWidth
                sx={formStyles}
            />

            <Button
                variant='contained'
                onClick={handleSendPacket}
                disabled={
                    (packetType === 'normal' && (!!macError || !validateMac(destMAC) || isSelfMac())) ||
                    (packetType === 'ARP' && (!arpTargetIp || !!ipError || !validateIp(arpTargetIp) || isSelfIp(arpTargetIp))) ||
                    (packetType === 'PING' && (!pingTargetIp || !!ipError || !validateIp(pingTargetIp) || isSelfIp(pingTargetIp)))
                }
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
                Отправить
            </Button>
        </Box>
    );
};

export default PacketModal;
