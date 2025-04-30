export type PortType = "trunk" | "access";

export interface Port {
  id: string;
  deviceId: string;
  name: string;
  type: PortType;
  vlan_id?: number;
  allowed_vlans?: number[];
  bandwidth?: number;
  latency?: number;
}

export type DeviceType = "router" | "switch" | "host";

export interface DeviceBase {
  id: string;
  type: DeviceType;
  name: string;
  ports: Port[];
  x?: number;
  y?: number;
}

export interface RoutingEntry {
  destination: string;
  gateway?: string;
  interface: string;
}

export interface Router extends DeviceBase {
  type: "router";
  routing_table: RoutingEntry[];
  icon: "../../../assets/entities/wireless-router.png";
}

export interface Switch extends DeviceBase {
  type: "switch";
  mac_table: Record<string, string>;
  icon: "../../../assets/entities/hub.png";
}

const DEFAULT_HOST_ICON = "src/assets/entities/desktop.png";

export interface Host extends DeviceBase {
  type: "host";
  ip_address: string;
  mac_address: string;
  gateway: string;
  icon: string;
}

export const createHost = (hostData: Omit<Host, "type" | "icon">): Host => ({
  type: "host",
  icon: DEFAULT_HOST_ICON,
  ...hostData,
});

export type Device = Router | Switch | Host;
