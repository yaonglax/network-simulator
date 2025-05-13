import { useNetworkStore } from "../store/network-store";
import { NetworkPacket } from "../types";
import handlePacketReply from "./handlePacketReply";

const getIncomingPort = (deviceId: string, packet: NetworkPacket) => {
  const { connections } = useNetworkStore.getState();
  const prevDeviceId = packet.path[packet.currentHop - 1]?.deviceId;

  const connection = connections.find(
    (c) =>
      (c.from.deviceId === prevDeviceId && c.to.deviceId === deviceId) ||
      (c.to.deviceId === prevDeviceId && c.from.deviceId === deviceId)
  );

  return connection?.from.deviceId === prevDeviceId
    ? connection.from.portId
    : connection?.to.portId;
};

const processPacketAtDevice = (packet: NetworkPacket, deviceId: string) => {
  const { devices } = useNetworkStore.getState();
  const currentDevice = devices[deviceId];
  if (!currentDevice) return;

  const currentStep = packet.path[packet.currentHop];
  if (currentStep && typeof currentStep.process === "function") {
    currentStep.process(packet, deviceId);
  }
};

export { processPacketAtDevice, getIncomingPort };
