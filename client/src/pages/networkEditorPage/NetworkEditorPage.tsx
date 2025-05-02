import { Box } from '@mui/material'
import { DevicesPanel } from "@/features/network-topology/components/DevicesPanel/DevicesPanel";
import { NetworkCanvas } from "@/features/network-topology/components/NetworkCanvas/NetworkCanvas";
import { SaveLoadControls } from "@/shared/ui";

const NetworkEditorPage = () => {

    return (
        <>
            <Box display="flex" height="100vh" p={2} gap={2}>
                <DevicesPanel />
                <NetworkCanvas />
                <SaveLoadControls />
            </Box>

        </>
    )
}

export default NetworkEditorPage
