import { Device, Port } from "@/features/network-topology/types";
import { Box, Typography } from "@mui/material";

interface PortsListProps {
    device: Device | null;
}

const PortsList: React.FC<PortsListProps> = ({ device }) => {
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
            {device.ports.map((port: Port, index: number) => (
                <Box
                    key={`${device.id}-port-${index}`}
                    component="section"
                    sx={{
                        p: 2,
                        border: '1px dashed grey',
                        borderRadius: 1,
                        backgroundColor: port.connectedTo ? '#f0f0f0' : 'transparent'
                    }}
                >
                    <Typography variant="body2">
                        {port.name || `Port ${index + 1}`} ({port.ip_address || 'no IP'}) —
                        {port.connectedTo
                            ? ` Connected to device: ${port.connectedTo.deviceId}`
                            : ' Not connected'}
                    </Typography>
                </Box>
            ))}
        </Box>
    );
};

export default PortsList;