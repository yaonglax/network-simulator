export type PortType = "trunk" | "access" | "none";

export interface Port {
  id: string;
  name: string;
  deviceId: string;
  type?: PortType;
  accessVlan?: number;
  allowedVlanList?: number[];
  active: boolean;
  isVlanEnabled: boolean;
  connectedTo?: {
    name: string;
    deviceId: string;
    portId: string;
    ip_address?: string;
    subnet_mask?: string;
  };
  mac_address?: string;
  ip_address?: string;
  subnet_mask?: string;
}

interface PortConfig {
  minPorts: number;
  maxPorts: number;
  defaultPorts: number;
}

export const DEVICE_PORT_CONFIG: Record<DeviceType, PortConfig> = {
  host: { minPorts: 1, maxPorts: 8, defaultPorts: 1 },
  switch: { minPorts: 4, maxPorts: 48, defaultPorts: 8 },
  router: { minPorts: 2, maxPorts: 32, defaultPorts: 4 },
} as const;

export type DeviceType = "router" | "switch" | "host";

export interface DeviceBase {
  id: string;
  type: DeviceType;
  name: string;
  ip_address?: string;
  mac_address?: string;
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
  routing_table: any[];
  icon: string;
}

export interface Switch extends DeviceBase {
  type: "switch";
  mac_table: Record<string, string>;
  icon: string;
}

const DEFAULT_HOST_ICON = "src/assets/entities/desktop.png";

export interface Host extends DeviceBase {
  type: "host";
  mac_address: string;
  gateway: string;
  icon: string;
}

export type Device = Router | Switch | Host;
