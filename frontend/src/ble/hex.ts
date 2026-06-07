// Hex <-> Base64 / bytes helpers for BLE payloads.
// react-native-ble-plx reads/writes characteristic values as base64 strings.

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export function normalizeHex(hex: string): string {
  return hex.replace(/[^0-9a-fA-F]/g, "").toUpperCase();
}

export function isValidHex(hex: string): boolean {
  const clean = normalizeHex(hex);
  return clean.length > 0 && clean.length % 2 === 0;
}

export function hexToBytes(hex: string): number[] {
  const clean = normalizeHex(hex);
  const bytes: number[] = [];
  for (let i = 0; i + 1 < clean.length; i += 2) {
    bytes.push(parseInt(clean.substr(i, 2), 16));
  }
  return bytes;
}

export function bytesToBase64(bytes: number[]): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < bytes.length ? bytes[i + 1] : undefined;
    const b2 = i + 2 < bytes.length ? bytes[i + 2] : undefined;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | ((b1 ?? 0) >> 4)];
    out += b1 === undefined ? "=" : B64[((b1 & 15) << 2) | ((b2 ?? 0) >> 6)];
    out += b2 === undefined ? "=" : B64[b2 & 63];
  }
  return out;
}

export function hexToBase64(hex: string): string {
  return bytesToBase64(hexToBytes(hex));
}

export function base64ToBytes(b64: string): number[] {
  const lookup: Record<string, number> = {};
  for (let i = 0; i < B64.length; i++) lookup[B64[i]] = i;
  const clean = b64.replace(/=+$/, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of clean) {
    if (!(ch in lookup)) continue;
    value = (value << 6) | lookup[ch];
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return bytes;
}

export function base64ToHex(b64: string): string {
  return base64ToBytes(b64)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ")
    .toUpperCase();
}

export function shortUuid(uuid: string): string {
  // Display the 16-bit short form when a UUID matches the BT base.
  const m = /^0000([0-9a-fA-F]{4})-0000-1000-8000-00805f9b34fb$/i.exec(uuid);
  return m ? `0x${m[1].toUpperCase()}` : uuid;
}
