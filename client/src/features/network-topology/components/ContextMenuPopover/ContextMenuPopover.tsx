import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Popover from '@mui/material/Popover';
import Button from '@mui/material/Button';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import { Device } from "@/features/network-topology/types";
import { useState } from "react";
import MacTableContent from "../MacTableContent/MacTableContent";
import PortsList from "../PortsList/PortsList";
import { ArrowBack } from "@mui/icons-material";
import PacketModal from '../PacketModal/PacketModal';
import SettingsContent from '../SettingsContent';
import { useNetworkStore } from '../../store/network-store';

interface PortsModalWindowProps {
    device: Device | null;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    setAnchorEl: (el: HTMLElement | null) => void;
}

type Choice = "МАС-таблица" | "Порты" | 'Настройки' | 'Удалить' | "Создать пакет";

export const ContextMenuPopover = ({ device, anchorEl, setAnchorEl }: PortsModalWindowProps) => {
    const [choice, setChoice] = useState<Choice | null>(null);
    const open = Boolean(anchorEl);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const updateDevice = useNetworkStore((state) => state.updateDevice);
    const removeDevice = useNetworkStore((state) => state.removeDevice)

    const handleDeviceSave = (updates: Partial<Device>) => {
        if (device !== null)
            updateDevice(device.id, updates);
        handlePopoverClose();
    };
    const handlePopoverClose = () => {
        setAnchorEl(null);
        setChoice(null);
    };
    const handleDeleteClick = () => {
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = () => {
        if (device) {
            removeDevice(device.id);
        }
        setDeleteDialogOpen(false);
        handlePopoverClose();
    };

    const handleDeleteCancel = () => {
        setDeleteDialogOpen(false);
    };

    const handleRenderContent = () => {
        if (!device) return null;

        switch (choice) {
            case "МАС-таблица":
                return <MacTableContent device={device} />;
            case "Настройки":
                return <SettingsContent device={device} onSave={handleDeviceSave} />;
            case "Порты":
                return <PortsList device={device} />;
            case "Удалить":
                return (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Typography>Вы уверены, что хотите удалить устройство?</Typography>
                        <Button variant="contained" color="error" onClick={handleDeleteConfirm}>
                            Удалить
                        </Button>
                        <Button onClick={() => {
                            handleDeleteCancel();
                            setChoice(null)
                        }}>
                            Отмена
                        </Button>
                    </Box>
                );
            case "Создать пакет":
                return <PacketModal device={device} handlePopoverClose={handlePopoverClose} />;
            default:
                return null;
        }
    };

    if (!device) return null;

    const menuItems = device.type !== 'host'
        ? ["МАС-таблица", "Порты", "Настройки", "Удалить"]
        : ["Порты", "Настройки", "Удалить", "Создать пакет"];

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={handlePopoverClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'left',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'left',
            }}
            PaperProps={{
                sx: { width: 300 }
            }}
        >
            <Box sx={{ p: 2 }}>
                {choice ? (
                    <>
                        <Button
                            onClick={() => setChoice(null)}
                            startIcon={<ArrowBack />}
                            sx={{ mb: 2 }}
                        >
                            Назад
                        </Button>
                        {handleRenderContent()}
                    </>
                ) : (
                    <MenuList>
                        {menuItems.map((item) => (
                            <MenuItem
                                key={item}
                                onClick={() => setChoice(item as Choice)}
                            >
                                {item}
                            </MenuItem>
                        ))}
                    </MenuList>
                )}
            </Box>
        </Popover>
    );
};

export default ContextMenuPopover;