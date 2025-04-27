import { Host as HostType } from "../../types"
import { Port } from "../../types/device.types";

interface HostProps {
    device: HostType;
    onPortClick?: (port: Port) => void;
}

const Host = ({ device, onPortClick }: HostProps) => {
    return (
        <div>{device.name}</div>
    )
}

export default Host