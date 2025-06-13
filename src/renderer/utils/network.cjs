// electron/utils/network.cjs
const randomMac = require("random-mac");

function generateMac() {
  return randomMac();
}

function generateIp(network) {
  try {
    if (!network || typeof network !== "string") {
      throw new Error("Сеть не указана или имеет неверный формат");
    }
    const [baseIp, subnetBits] = network.split("/");
    const maskBits = parseInt(subnetBits);
    if (!baseIp || isNaN(maskBits) || maskBits < 0 || maskBits > 32) {
      throw new Error("Неверный формат сети");
    }
    const ipParts = baseIp.split(".").map(Number);
    if (ipParts.length !== 4 || ipParts.some((p) => p < 0 || p > 255)) {
      throw new Error("Неверный IP-адрес");
    }
    const ipNum =
      (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const mask = ~(0xffffffff >>> maskBits);
    const networkAddr = ipNum & mask;
    const broadcastAddr = networkAddr | ~mask;
    const hostCount = Math.pow(2, 32 - maskBits) - 2;
    if (hostCount <= 0) {
      throw new Error("Сеть слишком мала для генерации IP");
    }
    const randomOffset = Math.floor(Math.random() * hostCount) + 1;
    const randomIpNum = networkAddr + randomOffset;
    return [
      (randomIpNum >> 24) & 0xff,
      (randomIpNum >> 16) & 0xff,
      (randomIpNum >> 8) & 0xff,
      randomIpNum & 0xff,
    ].join(".");
  } catch (e) {
    throw new Error(`Неверная сеть: ${network} - ${e.message}`);
  }
}

function getGateway(network) {
  try {
    if (!network || typeof network !== "string") {
      throw new Error("Сеть не указана или имеет неверный формат");
    }
    const [baseIp, subnetBits] = network.split("/");
    const maskBits = parseInt(subnetBits);
    if (!baseIp || isNaN(maskBits) || maskBits < 0 || maskBits > 32) {
      throw new Error("Неверный формат сети");
    }
    const ipParts = baseIp.split(".").map(Number);
    if (ipParts.length !== 4 || ipParts.some((p) => p < 0 || p > 255)) {
      throw new Error("Неверный IP-адрес");
    }
    const ipNum =
      (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const mask = ~(0xffffffff >>> maskBits);
    const networkAddr = ipNum & mask;
    const gatewayNum = networkAddr + 1;
    return [
      (gatewayNum >> 24) & 0xff,
      (gatewayNum >> 16) & 0xff,
      (gatewayNum >> 8) & 0xff,
      gatewayNum & 0xff,
    ].join(".");
  } catch (e) {
    throw new Error(`Неверная сеть: ${network} - ${e.message}`);
  }
}

module.exports = { generateMac, generateIp, getGateway };
