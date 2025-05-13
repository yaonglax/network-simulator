
import { Box, Button, MenuItem, MenuList, TextField, Typography, RadioGroup, FormControlLabel, Radio } from '@mui/material';
import { Device, NetworkPacket } from '../../types';
import { useState } from 'react';
import { useNetworkStore } from '../../store/network-store';

interface PacketModalProps {
    device: Device;
    handlePopoverClose: () => void;
}

type PacketType = 'normal' | 'ARP';

const PacketModal = ({ device, handlePopoverClose }: PacketModalProps) => {
    const [destMAC, setDestMAC] = useState('');
    const [payload, setPayload] = useState('');
    const [macError, setMacError] = useState<string | null>(null);
    const [selectedPortId, setSelectedPortId] = useState<string>('');
    const [packetType, setPacketType] = useState<PacketType>('normal');
    const [arpTargetIp, setArpTargetIp] = useState('');
    const { addPacket, devices } = useNetworkStore();

    const connectedPorts =
        device.ports?.filter(
            (port) => port.connectedTo?.deviceId && devices[port.connectedTo.deviceId]
        ) || [];

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
            device.type === 'host' ? device.mac_address : sourcePort.mac_address || '';

        // --- VLAN: если порт access и включён VLAN, сразу ставим vlanId ---
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
                x: device.x || 0,
                y: device.y || 0,
                isResponse: false,
                isFlooded: true,
                type: 'ARP',
                vlanId, // <-- вот тут!
            };
        } else {
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
                x: device.x || 0,
                y: device.y || 0,
                isResponse: false,
                isFlooded: destMAC === 'FF:FF:FF:FF:FF:FF',
                type: 'DATA',
                vlanId, // <-- вот тут!
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: 300 }}>
            <Typography variant='h6'>Отправка пакета</Typography>

            <RadioGroup
                row
                value={packetType}
                onChange={(e) => setPacketType(e.target.value as PacketType)}
            >
                <FormControlLabel value="normal" control={<Radio />} label="Обычный пакет" />
                <FormControlLabel value="ARP" control={<Radio />} label="ARP-запрос" />
            </RadioGroup>

            <Box>
                <Typography variant='subtitle2'>Исходящий порт:</Typography>
                <MenuList>
                    {connectedPorts.map((port) => {
                        if (!port.connectedTo?.deviceId) return null;
                        const targetDevice = devices[port.connectedTo.deviceId];
                        return (
                            <MenuItem
                                key={port.id}
                                selected={port.id === selectedPortId}
                                onClick={() => setSelectedPortId(port.id)}
                                sx={{
                                    bgcolor: port.id === selectedPortId ? '#f5f5f5' : 'inherit',
                                    borderRadius: 1,
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography>{port.name}</Typography>
                                    <Typography variant='caption' color='text.secondary'>
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
                />
            )}

            {packetType === 'ARP' && (
                <TextField
                    label="IP-адрес, который ищем (target IP)"
                    value={arpTargetIp}
                    onChange={(e) => setArpTargetIp(e.target.value)}
                    size="small"
                    required
                />
            )}

            <TextField
                label={packetType === 'ARP' ? 'ARP payload (автоматически)' : 'Содержимое пакета'}
                value={packetType === 'ARP' ? '' : payload}
                onChange={(e) => setPayload(e.target.value)}
                multiline
                rows={3}
                disabled={packetType === 'ARP'}
            />

            <Button
                variant='contained'
                onClick={handleSendPacket}
                disabled={
                    !selectedPortId ||
                    (packetType === 'normal' && !!macError) ||
                    (packetType === 'ARP' && !arpTargetIp)
                }
            >
                Отправить
            </Button>
        </Box>
    );
};

export default PacketModal;
