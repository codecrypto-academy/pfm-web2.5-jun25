"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// mcp-server/src/index.ts
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const actions = __importStar(require("./actions"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(body_parser_1.default.json());
// Endpoint MCP universel
app.post('/api/mcp', async (req, res) => {
    const { tool, args } = req.body;
    try {
        let result;
        switch (tool) {
            case 'create_besu_network':
                result = await actions.createBesuNetwork(args.name, args.chainId, args.subnet, args.bootnodeIP, args.signerAccount, args.listOfNodes, args.prefundedAccounts, args.nbrNetwork);
                break;
            case 'remove_besu_network':
                result = await actions.removeBesuNetwork(args.name);
                break;
            case 'add_besu_node':
                result = await actions.addBesuNode(args.networkName, args.nodeName, args.nodeType, args.port, args.ip);
                break;
            case 'remove_besu_node':
                result = await actions.removeBesuNode(args.networkName, args.nodeName);
                break;
            case 'start_besu_network':
                result = await actions.startBesuNetwork(args.name);
                break;
            case 'stop_besu_network':
                result = await actions.stopBesuNetwork(args.name);
                break;
            case 'get_besu_balance':
                result = await actions.getBesuBalance(args.networkName, args.address);
                break;
            case 'list_networks':
                result = await actions.getNetworksForLocalStorage();
                break;
            default:
                return res.status(400).json({ error: `Outil inconnu: ${tool}` });
        }
        return res.json({ success: true, result });
    }
    catch (error) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`MCP Besu server HTTP listening on port ${PORT}`);
});
