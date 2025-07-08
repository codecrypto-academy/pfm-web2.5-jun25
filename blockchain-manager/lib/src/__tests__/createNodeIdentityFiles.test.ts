import fs from "fs";
import { BesuNodeConfig, BesuNodeType } from "../types";
import { createNodeIdentityFiles } from "../services/createNodeIdentityFiles";
jest.mock("fs");

describe('createNodeIdentityFiles', () => {
    const nodeConfigStub: BesuNodeConfig = {
        name: "mocknode",
        network: {
            name: "mocknetwork",
            ip: "127.0.0.1"
        },
        hostPort: 8888,
        type: BesuNodeType.RPC
    };
    const nodeIdentityPath = `${process.cwd()}/${nodeConfigStub.network.name}`;

    const mockIdentityData = {
        privateKey: "mock-private-key",
        publicKey: "mock-public-key",
        address: "mock-address",
        enode: "mock-enode",
    };

    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(require('../services/generateNodeIdentity'), 'generateNodeIdentity').mockReturnValue({
            privateKey: mockIdentityData.privateKey,
            publicKey: mockIdentityData.publicKey,
            address: mockIdentityData.address,
            enode: mockIdentityData.enode,
        });

        fs.existsSync = jest.fn();
        fs.mkdirSync = jest.fn();
        fs.writeFileSync = jest.fn();
    });


    it('should create the node identity files', () => {

        createNodeIdentityFiles(nodeConfigStub);

        expect(fs.existsSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}`);
        expect(fs.mkdirSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}`, { recursive: true });
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}/key.priv`, mockIdentityData.privateKey);
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}/key.pub`, mockIdentityData.publicKey);
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}/address`, mockIdentityData.address);
        expect(fs.writeFileSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}/enode`, mockIdentityData.enode);
    });

    it('should not create directory if it already exists', () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        createNodeIdentityFiles(nodeConfigStub);

        expect(fs.existsSync).toHaveBeenCalledWith(`${nodeIdentityPath}/${nodeConfigStub.name}`);
        expect(fs.mkdirSync).not.toHaveBeenCalled();
    });

    it('should propagate mkdir errors', () => {
        (fs.mkdirSync as jest.Mock).mockImplementation(() => {
            throw new Error('mkdir failed');
        });

        expect(() => createNodeIdentityFiles(nodeConfigStub)).toThrow('mkdir failed');
    });

    it('should return correct file paths', () => {
        const result = createNodeIdentityFiles(nodeConfigStub);

        expect(result).toEqual({
            privateKeyFile: `${nodeConfigStub.name}/key.priv`,
            publicKeyFile: `${nodeConfigStub.name}/key.pub`,
            addressFile: `${nodeConfigStub.name}/address`,
            enodeFile: `${nodeConfigStub.name}/enode`,
        });
    });

    it('should handle file system errors gracefully', () => {
        (fs.writeFileSync as jest.Mock).mockImplementation(() => {
            throw new Error('Permission denied');
        });

        expect(() => createNodeIdentityFiles(nodeConfigStub)).toThrow('Permission denied');
    });

    it('should handle different network configurations', () => {
        const differentConfig = {
            ...nodeConfigStub,
            network: { name: "different-network", ip: "192.168.1.1" }
        };
        const nodeIdentityPath = `${process.cwd()}/${differentConfig.network.name}`;

        const result = createNodeIdentityFiles(differentConfig);

        expect(result).toEqual({
            privateKeyFile: `${differentConfig.name}/key.priv`,
            publicKeyFile: `${differentConfig.name}/key.pub`,
            addressFile: `${differentConfig.name}/address`,
            enodeFile: `${differentConfig.name}/enode`,
        });
    });
});