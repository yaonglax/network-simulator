
import { useState } from 'react';
import { Box } from '@mui/material';
import { NetworkCanvas } from '@/features/network-topology/components/NetworkCanvas/NetworkCanvas';
import PersistentDrawerLeft from '@/features/theory/Drawer';

const NetworkEditorPage = () => {
    const [drawerOpen, setDrawerOpen] = useState(false);

    return (
        <Box
            sx={{
                height: '100vh',
                backgroundColor: 'var(--bg-dark-gray)',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            <PersistentDrawerLeft
                open={drawerOpen}
                onToggle={() => setDrawerOpen((prev) => !prev)}
            />
            <Box
                component="main"
                sx={{
                    height: '100vh',
                    width: '100%',
                }}
            >
                <NetworkCanvas />
            </Box>
        </Box>
    );
};

export default NetworkEditorPage;
