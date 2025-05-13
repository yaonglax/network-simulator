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

    const handlePopoverClose = () => {
        setAnchorEl(null);
        setChoice(null);
    };

    const SettingsContent = ({ device }: { device: Device }) => {
        return (
            <Box sx={{ p: 2 }}>
                <Typography variant="h6">Настройки устройства</Typography>
                <Typography>{device.name}</Typography>
            </Box>
        );
    };

    const handleRenderContent = () => {
        if (!device) return null;

        switch (choice) {
            case "МАС-таблица":
                return <MacTableContent device={device} />;
            case "Настройки":
                return <SettingsContent device={device} />;
            case "Порты":
                return <PortsList device={device} />;
            case "Удалить":
                return <Typography>Delete</Typography>;
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