import { Box } from '@mui/material';
import { NetworkCanvas } from '@/features/network-topology/components/NetworkCanvas/NetworkCanvas';
import PersistentDrawerLeft from '@/features/theory/Drawer';

const NetworkEditorPage = () => {
    return (
        <Box sx={{
            height: '100vh',
            backgroundColor: 'var(--bg-dark-gray)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <PersistentDrawerLeft />
            <NetworkCanvas />
        </Box>
    );
};

export default NetworkEditorPage;