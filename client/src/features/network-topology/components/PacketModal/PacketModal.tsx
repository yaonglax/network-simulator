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
    const [selectedPortId, setSelectedPortId] = useState<string>('');
    const [packetType, setPacketType] = useState<PacketType>('normal');
    const [arpTargetIp, setArpTargetIp] = useState('');
    const { addPacket, devices } = useNetworkStore();

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

    const handleMacChange = (value: string) => {
        setDestMAC(value);
        if (!validateMac(value)) {
            setMacError('Неверный формат MAC-адреса');
        } else {
            setMacError(null);
        }
    };

    const handleSendPacket = () => {
        if (!selectedPortId || (packetType === 'normal' && macError)) {
            console.warn('Cannot send packet: invalid port or MAC error', {
                selectedPortId,
                macError,
            });
            return;
        }

        const sourcePort = device.ports?.find((p) => p.id === selectedPortId);
        if (!sourcePort) {
            console.error('Source port not found:', selectedPortId);
            return;
        }

        const sourceMAC =
            device.type === 'host' ? device.mac_address : sourcePort.mac_address ?? '';

        let vlanId: number | undefined = undefined;
        if (sourcePort.isVlanEnabled && sourcePort.type === 'access') {
            vlanId = sourcePort.accessVlan;
        }

        let packet: NetworkPacket;

        if (packetType === 'ARP') {
            if (!arpTargetIp) {
                alert('Укажите IP-адрес, который ищете (target IP)');
                return;
            }
            packet = {


                id: crypto.randomUUID(),
                path: [],
                currentHop: 0,
                sourceDeviceId: device.id,
                sourcePortId: selectedPortId,
                sourceMAC,
                destMAC: 'FF:FF:FF:FF:FF:FF',
                payload: JSON.stringify({
                    type: 'ARP-REQUEST',
                    targetIp: arpTargetIp,
                    senderIp: device.ip_address,
                }),
                ttl: 64,
                x: device.x ?? 0,
                y: device.y ?? 0,
                isResponse: false,
                isFlooded: true,
                type: 'ARP',
                vlanId,
            };
        }
        else if (packetType === 'PING') {
            const now = Date.now();
            if (!destMAC || macError) {
                alert('Укажите корректный MAC-адрес назначения для ping');
                return;
            }
            packet = {
                id: crypto.randomUUID(),
                path: [],
                currentHop: 0,
                sourceDeviceId: device.id,
                sourcePortId: selectedPortId,
                sourceMAC,
                destMAC,
                payload: JSON.stringify({ type: "PING-REQUEST" }),
                ttl: 64,
                x: device.x ?? 0,
                y: device.y ?? 0,
                isResponse: false,
                isFlooded: false,
                type: "PING",
                vlanId,
                sentAt: now,
            };
        }
        else {
            packet = {
                id: crypto.randomUUID(),
                path: [],
                currentHop: 0,
                sourceDeviceId: device.id,
                sourcePortId: selectedPortId,
                sourceMAC,
                destMAC,
                payload,
                ttl: 64,
                x: device.x ?? 0,
                y: device.y ?? 0,
                isResponse: false,
                isFlooded: destMAC === 'FF:FF:FF:FF:FF:FF',
                type: 'DATA',
                vlanId,
            };
        }

        console.log('Sending packet:', {
            id: packet.id,
            sourceDeviceId: packet.sourceDeviceId,
            sourcePortId: packet.sourcePortId,
            sourceMAC: packet.sourceMAC,
            destMAC: packet.destMAC,
            isFlooded: packet.isFlooded,
            type: packet.type,
            payload: packet.payload,
            vlanId: packet.vlanId,
        });

        addPacket(packet);
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
                <Typography variant='subtitle2' sx={{ color: 'rgba(229, 231, 235, 0.5)', mb: 1 }}>
                    Исходящий порт:
                </Typography>
                <MenuList sx={{
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: 1,
                    p: 0,
                    maxHeight: 200,
                    overflow: 'auto'
                }}>
                    {connectedPorts.map((port) => {
                        if (!port.connectedTo?.deviceId) return null;
                        const targetDevice = devices[port.connectedTo.deviceId];
                        return (
                            <MenuItem
                                key={port.id}
                                selected={port.id === selectedPortId}
                                onClick={() => setSelectedPortId(port.id)}
                                sx={{
                                    color: 'white',
                                    '&.Mui-selected': {
                                        backgroundColor: '#8053b0',
                                    },
                                    '&:hover': {
                                        backgroundColor: '#8053b080',
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography>{port.name}</Typography>
                                    <Typography variant='caption' sx={{ color: 'rgba(229, 231, 235, 0.7)' }}>
                                        Подключён к: {targetDevice?.name} ({targetDevice?.type})
                                    </Typography>
                                </Box>
                            </MenuItem>
                        );
                    })}
                </MenuList>
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
                    onChange={(e) => setArpTargetIp(e.target.value)}
                    size="small"
                    required
                    fullWidth
                    sx={formStyles}
                />
            )}

            {packetType === 'PING' && (
                <TextField
                    label='MAC назначения'
                    value={destMAC}
                    onChange={(e) => handleMacChange(e.target.value)}
                    error={!!macError}
                    helperText={macError}
                    size='small'
                    placeholder='MAC-адрес получателя'
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
                    !selectedPortId ||
                    (packetType === 'normal' && !!macError) ||
                    (packetType === 'ARP' && !arpTargetIp)
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