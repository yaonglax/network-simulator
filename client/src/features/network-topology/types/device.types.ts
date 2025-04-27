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
}

export interface Switch extends DeviceBase {
  type: "switch";
  mac_table: Record<string, string>;
}

export interface Host extends DeviceBase {
  type: "host";
  ip_address: string;
  mac_address: string;
  gateway: string;
}

export type Device = Router | Switch | Host;
