import ControlledAccordions from '@/features/teory/ControlledAccordions';
import { Box } from '@mui/material';
import PersistentDrawerLeft from '@/features/teory/Drawer';

const TheoryPage = () => {
    const drawerItems = [
        "Введение в сети",
        "Основы коммутации",
        "MAC и IP адреса",
        "ARP-запросы",
        "Типы передачи данных",
        "Старение MAC-таблицы",
        "VLAN",
        "PING",
        "DHCP",
        "NAT"
    ];

    return (
        <PersistentDrawerLeft>
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    transition: (theme) => theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                }}
            >
                <ControlledAccordions />
            </Box>
        </PersistentDrawerLeft>
    );
}

export default TheoryPage;