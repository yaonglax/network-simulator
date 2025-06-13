import { Connection, Device } from "../types";

export function willCreateLoop(
  devices: Record<string, Device>,
  connections: Connection[],
  fromDeviceId: string,
  toDeviceId: string
): boolean {
  const visited = new Set<string>();
  const stack = [fromDeviceId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === toDeviceId) {
      return true;
    }
    visited.add(current);
    const neighbors = connections
      .filter(
        (conn) => conn.from.deviceId === current || conn.to.deviceId === current
      )
      .map((conn) =>
        conn.from.deviceId === current ? conn.to.deviceId : conn.from.deviceId
      )
      .filter((neighborId) => !visited.has(neighborId));
    stack.push(...neighbors);
  }
  return false;
}
