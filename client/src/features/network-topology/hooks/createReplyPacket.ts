import { NetworkPacket } from "../types";
import { v4 as uuidv4 } from "uuid";

export const createReplyPacket = (
  originalPacket: NetworkPacket
): NetworkPacket => {
  const reversedPath = [...originalPacket.path].reverse();

  return {
    ...originalPacket,
    id: uuidv4(), // Генерация нового уникального ID
    sourceDeviceId: originalPacket.destMAC,
    destMAC: originalPacket.sourceMAC,
    sourceMAC: originalPacket.destMAC,
    sourceIP: originalPacket.destIP,
    destIP: originalPacket.sourceIP,
    currentHop: 0,
    path: reversedPath,
    payload: "Reply",
  };
};
