import Host from "@/features/network-topology/components/Host/Host"
import { Host as HostType } from "@/features/network-topology/types";
import { useNetworkStore } from "@/features/network-topology/store/network-store";

const NetworkEditorPage = () => {
    const { devices, connections } = useNetworkStore();
    const testHost: HostType = {
        id: "host1",
        name: "My Computer",
        type: "host",
        ip_address: "192.168.1.10",
        mac_address: "00:AA:BB:CC:DD:EE",
        ports: [
            {
                deviceId: "host1",
                id: "eth0",
                name: "Ethernet",
                type: "access",
                vlan_id: 1
            }
        ],
        x: 100,
        y: 100,
        gateway: '0.0.0.0'
    };
    return (
        <>
            <div>NetworkEditorPage</div>
            <Host device={testHost} />
            <div>
                <h2>Устройства</h2>
                <pre>{JSON.stringify(devices, null, 2)}</pre>

                <h2>Соединения</h2>
                <pre>{JSON.stringify(connections, null, 2)}</pre>
            </div>
        </>
    )
}

export default NetworkEditorPage