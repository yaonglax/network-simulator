import { Device, NetworkPacket } from "../types";

interface handlePacketReplyProps {
  receivedPacket: NetworkPacket;
  device: Device;
}

const handlePacketReply = ({
  receivedPacket,
  device,
}: handlePacketReplyProps) => {
  // 1. Проверяем, что пакет предназначен для данного устройства
  if (receivedPacket.destMAC !== device.mac_address) {
    console.log("Этот пакет не для данного устройства.");
    return;
  }
};

export default handlePacketReply;
