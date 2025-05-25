
import { useNetworkStore } from "../../store/network-store";
import { Box, Typography } from "@mui/material";

interface PortsListProps {
    deviceId: string | null;
}

const PortsList: React.FC<PortsListProps> = ({ deviceId }) => {
    const device = useNetworkStore(state => deviceId ? state.devices[deviceId] : null);
    const devices = useNetworkStore(state => state.devices);

    if (!device) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography>Устройство не выбрано</Typography>
            </Box>
        );
    }

    if (!device.ports || device.ports.length === 0) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography>Нет доступных портов</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 1 }}>
            {device.ports.map((port, index) => (
                <Box
                    key={`${device.id}-port-${index}`}
                    component="section"
                    sx={{
                        p: 2,
                        border: '1px dashed grey',
                        borderRadius: 1,
                        color: 'var(--text-gray)',
                        backgroundColor: port.connectedTo ? 'var(--detail-gray)' : 'transparent'
                    }}
                >
                    <Typography variant="body2">
                        {port.name || `Port ${index + 1}`} (
                        {device.type === 'host'
                            ? device.ip_address || 'no IP'
                            : port.ip_address || 'no IP'}
                        ) —
                        {port.connectedTo
                            ? `→ ${devices[port.connectedTo.deviceId]?.name ?? port.connectedTo.deviceId} (${port.connectedTo.portId})`
                            : ' Not connected'}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default PortsList;
