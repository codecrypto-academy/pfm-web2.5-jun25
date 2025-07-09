// mcp-server/src/index.ts
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import * as actions from './actions';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoint MCP universel
app.post('/api/mcp', async (req: express.Request, res: express.Response) => {
  const { tool, args } = req.body;
  try {
    let result;
    switch (tool) {
      case 'create_besu_network':
        result = await actions.createBesuNetwork(
          args.name,
          args.chainId,
          args.subnet,
          args.bootnodeIP,
          args.signerAccount,
          args.listOfNodes,
          args.prefundedAccounts,
          args.nbrNetwork
        );
        break;
      case 'remove_besu_network':
        result = await actions.removeBesuNetwork(args.name);
        break;
      case 'add_besu_node':
        result = await actions.addBesuNode(
          args.networkName,
          args.nodeName,
          args.nodeType,
          args.port,
          args.ip
        );
        break;
      case 'remove_besu_node':
        result = await actions.removeBesuNode(
          args.networkName,
          args.nodeName
        );
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
  } catch (error) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MCP Besu server HTTP listening on port ${PORT}`);
});