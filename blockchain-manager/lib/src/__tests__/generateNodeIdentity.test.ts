import { generateNodeIdentity } from "../services/generateNodeIdentity";

describe('generateNodeIdentity', () => {
    it('should generate all required properties', () => {
        const result = generateNodeIdentity('192.168.1.100');

        expect(result).toHaveProperty('privateKey');
        expect(result).toHaveProperty('publicKey');
        expect(result).toHaveProperty('address');
        expect(result).toHaveProperty('enode');
    });

    it('should generate valid format for each property', () => {
        const result = generateNodeIdentity('192.168.1.100');

        // Test formats, not exact values
        expect(result.privateKey).toMatch(/^[0-9a-f]{64}$/);
        expect(result.publicKey).toMatch(/^04[0-9a-f]{128}$/);
        expect(result.address).toMatch(/^[0-9a-f]{40}$/);
        expect(result.enode).toMatch(/^enode:\/\/[0-9a-f]{128}@192\.168\.1\.100:30303$/);
    });

    it('should include IP address in enode', () => {
        const ip = '192.168.1.100';
        const result = generateNodeIdentity(ip);

        expect(result.enode).toContain(ip);
        expect(result.enode).toContain(':30303');
    });
});