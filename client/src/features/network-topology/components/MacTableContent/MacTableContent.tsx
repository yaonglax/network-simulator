import { useNetworkStore } from "@/features/network-topology/store/network-store";
import { Device, MacTableEntry } from "@/features/network-topology/types";
import { Box, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useEffect, useState } from "react";

interface MacTableRecord {
    vlanId: number;
    macAddress: string;
    entry: MacTableEntry;
}

const MacTableContent = ({ device }: { device: Device }) => {
    const { macTables } = useNetworkStore();
    const [switchMacTable, setSwitchMacTable] = useState<MacTableRecord[]>([]);

    if (device.type !== "switch") {
        return <Typography>MAC-таблица доступна только для коммутаторов</Typography>;
    }

    useEffect(() => {
        console.log(`Raw macTables for ${device.id}:`, macTables[device.id]);
        const macTable = macTables[device.id] || { 0: {} };
        const records: MacTableRecord[] = Object.entries(macTable).flatMap(([vlanId, entries]) =>
            Object.entries(entries).map(([macAddress, entry]) => ({
                vlanId: Number(vlanId),
                macAddress,
                entry,
            }))
        );
        console.log(`Updating MAC table for switch ${device.id}:`, records);
        setSwitchMacTable(records);
    }, [macTables, device.id]);

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                MAC-таблица {device.name}
            </Typography>

            {switchMacTable.length === 0 ? (
                <Typography>MAC-таблица пуста</Typography>
            ) : (
                <List>
                    {switchMacTable.map(({ vlanId, macAddress, entry }) => {
                        const port = device.ports.find((p) => p.id === entry.portId);

                        return (
                            <ListItem key={`${vlanId}-${macAddress}`}>
                                <ListItemText
                                    primary={`MAC: ${macAddress}`}
                                    secondary={`${port?.isVlanEnabled ? `VLAN: ${vlanId},` : ''} Порт: ${port ? port.name : entry.portId} ${port ? "" : "(не найден)"}`}
                                />
                            </ListItem>
                        );
                    })}
                </List>
            )}
        </Box>
    );
};

export default MacTableContent;