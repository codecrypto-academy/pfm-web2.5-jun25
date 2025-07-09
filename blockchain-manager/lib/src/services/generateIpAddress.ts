
export function generateIpAddress(subnet: string, index: number): string {
    const [ip, prefixLenStr] = subnet.split('/');
    const prefixLen = parseInt(prefixLenStr, 10);

    if (isNaN(prefixLen) || prefixLen < 0 || prefixLen > 32) {
        throw new Error('Invalid subnet prefix length.');
    }

    const ipParts = ip.split('.').map(Number);
    if (ipParts.some(isNaN) || ipParts.length !== 4 || ipParts.some(part => part < 0 || part > 255)) {
        throw new Error('Invalid IP address format.');
    }

    const ipAsInt = (
        (ipParts[0] << 24) |
        (ipParts[1] << 16) |
        (ipParts[2] << 8) |
        ipParts[3]
    ) >>> 0;

    const networkMask = ((0xFFFFFFFF << (32 - prefixLen))) >>> 0;
    const networkAddress = (ipAsInt & networkMask) >>> 0;
    const broadcastAddress = (networkAddress | (~networkMask)) >>> 0;

    const targetIp = networkAddress + 100 + index; // Start from the first usable host IP (networkAddress + 1) and add the index

    if (targetIp >= broadcastAddress) {
        throw new Error('Requested IP address is outside the subnet range.');
    }

    const ipString = [
        (targetIp >>> 24) & 0xFF,
        (targetIp >>> 16) & 0xFF,
        (targetIp >>> 8) & 0xFF,
        targetIp & 0xFF,
    ].join('.');

    return ipString;
} 