export interface Connection {
  id: string;
  from: {
    deviceId: string;
    portId: string;
  };
  to: {
    deviceId: string;
    portId: string;
  };
}
export interface MacTable {
  [macAddress: string]: string;
}
export type SwitchMacTables = Record<string, Record<string, string>>;

export interface PathStep {
  deviceId: string;
  portId: string;
  process?: (packet: NetworkPacket, deviceId: string) => void;
}

export interface NetworkPacket {
  id: string;
  sourceMAC: string;
  destMAC: string;
  sourceDeviceId: string;
  destDeviceId?: string;
  sourcePortId: string;
  vlanId?: number;
  payload: string;
  x?: number;
  y?: number;
  path: Array<{
    deviceId: string;
    portId: string;
    process: (p: NetworkPacket, deviceId: string) => void;
  }>;
  originalPath?: Array<{
    deviceId: string;
    portId: string;
    process: (p: NetworkPacket, deviceId: string) => void;
  }>;
  currentHop: number;
  isFlooded?: boolean;
  isResponse: boolean;
  ttl: number;
  visited?: Set<string>;
  type?: string;
  arpReplyPending?: boolean;
  sentAt?: number;
  isProcessed: boolean;
  isPlaying: boolean;
  position?: { x: number; y: number };
}

export interface MacTableEntry {
  portId: string;
  timestamp: number;
}
