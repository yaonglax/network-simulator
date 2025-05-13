import React, { useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { HelpOutline, MailOutline } from '@mui/icons-material';
import { useNetworkStore } from '../../store/network-store';

interface PacketEntityProps {
    packetId: string;
    isPlaying: boolean;
}

const PacketEntity = ({ packetId, isPlaying }: PacketEntityProps) => {
    const packet = useNetworkStore((state) => state.packets[packetId]);
    const devices = useNetworkStore((state) => state.devices);

    // --- Защита: если пакета нет — не рендерим и не вызываем хуки ---
    if (!packet) {
        console.warn(`Packet ${packetId} not found, skipping render`);
        return null;
    }

    // Все хуки — до любых return ниже!
    const currentPosition = useMemo(() => {
        let lastValid = { x: packet.x ?? 0, y: packet.y ?? 0 };
        const points = packet.path.map((hop) => {
            const device = devices[hop.deviceId];
            if (!device || device.x === undefined || device.y === undefined) {
                return lastValid;
            }
            lastValid = { x: device.x + 25, y: device.y + 25 };
            return lastValid;
        });
        return points[packet.currentHop];
    }, [devices, packet.path, packet.currentHop, packet.x, packet.y]);

    useEffect(() => {
        console.log(`Packet ${packetId} state:`, {
            currentHop: packet.currentHop,
            isFlooded: packet.isFlooded,
            isPlaying,
            path: packet.path?.map((hop) => hop.deviceId),
            type: packet.type,
        });
    }, [packetId, packet.currentHop, packet.isFlooded, isPlaying, packet.path, packet.type]);

    const { packetColor, packetIcon } = useMemo(() => {
        if (packet.type === 'ARP') {
            if (packet.isResponse) {
                return { packetColor: '#4caf50', packetIcon: <MailOutline fontSize="small" /> };
            }
            else {
                return { packetColor: '#ff9800', packetIcon: <HelpOutline fontSize="small" /> };
            }
        } else if (packet.isFlooded) {
            return { packetColor: 'pink', packetIcon: <MailOutline fontSize="small" /> };
        } else if (packet.isResponse) {
            return { packetColor: '#1976d2', packetIcon: <MailOutline fontSize="small" /> };
        } else {
            return { packetColor: '#2196f3', packetIcon: <MailOutline fontSize="small" /> };
        }
    }, [packet.type, packet.isResponse, packet.isFlooded]);

    // --- Защита: если path некорректен — не рендерим ---
    if (
        !Array.isArray(packet.path) ||
        packet.currentHop == null ||
        packet.currentHop >= packet.path.length
    ) {
        return null;
    }
    if (!currentPosition || typeof currentPosition.x !== 'number' || typeof currentPosition.y !== 'number') {
        return null;
    }

    const variants = {
        playing: {
            x: currentPosition.x,
            y: currentPosition.y,
            transition: {
                duration: 1.5,
                ease: 'linear',
            },
        },
        stopped: {
            x: currentPosition.x,
            y: currentPosition.y,
            opacity: 0.5,
            transition: { duration: 0.2 },
        },
    };

    return (
        <motion.div
            key={packet.id}
            initial={{
                x: currentPosition.x,
                y: currentPosition.y,
            }}
            variants={variants}
            animate={isPlaying ? 'playing' : 'stopped'}
            style={{
                position: 'absolute',
                zIndex: 1000,
            }}
        >
            {React.cloneElement(packetIcon, {
                color: 'inherit',
                style: {
                    color: packetColor,
                    filter: packet.isFlooded ? 'drop-shadow(0 0 4px #fff)' : undefined,
                },
            })}
        </motion.div>
    );
};

export default PacketEntity;
