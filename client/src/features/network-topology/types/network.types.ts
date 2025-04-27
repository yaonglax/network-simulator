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
