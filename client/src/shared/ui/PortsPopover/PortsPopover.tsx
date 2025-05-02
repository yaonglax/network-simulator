import {
    Box,
    Typography,
    Popover
} from "@mui/material"
import { Device } from "@/features/network-topology/types"


interface PortsModalWIndowProps {
    device: Device | null;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    setAnchorEl: (el: HTMLElement | null) => void;
}

export const PortsPopover = ({ device, anchorEl, setAnchorEl }: PortsModalWIndowProps) => {

    const open = Boolean(anchorEl);
    const handlePopoverClose = () => {
        setAnchorEl(null);
    };

    if (!device) return null;

    return (
        <>
            <Typography>`${device.name}`</Typography>
            <Popover
                id="mouse-over-popover"
                sx={{ pointerEvents: 'none' }}
                open={open}
                anchorEl={anchorEl}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                onClose={handlePopoverClose}
                disableAutoFocus // Отключаем автофокус
                disableEnforceFocus // Позволяем фокусу выходить за пределы Popover
                disableRestoreFocus
            >
                <Box>{device.ports.length > 0 && (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {device.ports.map((port, index) => (
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
                                    {port.name} ({port.ip_address || 'no IP'}) —
                                    {port.connectedTo
                                        ? `Connected to: ${port.connectedTo.name} (${port.connectedTo.deviceId})`
                                        : 'Not connected'}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                )}</Box>
            </Popover>
        </>
    )
}

export default PortsPopover