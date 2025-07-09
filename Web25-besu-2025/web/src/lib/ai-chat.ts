import { OpenAIClient } from './openai-client';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    console.error('[ai-chat] Wrong HTTP method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history } = req.body;
  let safeHistory: any[] = [];
  if (Array.isArray(history)) {
    safeHistory = history;
  } else if (history && typeof history === 'object') {
    safeHistory = Object.values(history);
  }

  try {
    console.log('[ai-chat] Message received:', message);
    console.log('[ai-chat] History:', safeHistory);
    // Use OpenAIClient to analyze the message and decide actions
    const openaiClient = new OpenAIClient();
    let aiDecision;
    try {
      // For demo, we use a static tool list
      // You can replace with a MCP fetch if needed
      const toolsArray = [
        {
          name: 'create_besu_network',
          description: 'Creates a full Hyperledger Besu network with nodes, accounts, and parameters.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Network name' },
              chainId: { type: 'number', description: 'Chain ID' },
              subnet: { type: 'string', description: 'Subnet (e.g. 192.168.0.0/24)' },
              bootnodeIP: { type: 'string', description: 'Bootnode IP address' },
              signerAccount: { type: 'string', description: 'Signer account' },
              listOfNodes: {
                type: 'array',
                description: 'List of nodes to create',
                items: {
                  type: 'object',
                  properties: {
                    nodeType: { type: 'string', description: 'Node type (miner, rpc, node)' },
                    ip: { type: 'string', description: 'Node IP address' },
                    name: { type: 'string', description: 'Node name' },
                    port: { type: 'number', description: 'Node port' }
                  },
                  required: ['nodeType', 'ip', 'name', 'port']
                }
              },
              prefundedAccounts: {
                type: 'array',
                description: 'Prefunded accounts',
                items: {
                  type: 'object',
                  properties: {
                    address: { type: 'string', description: 'Account address' },
                    amount: { type: 'string', description: 'Prefund amount' }
                  },
                  required: ['address', 'amount']
                }
              },
              nbrNetwork: { type: 'number', description: 'Network number (optional)' }
            },
            required: ['name', 'chainId', 'subnet', 'bootnodeIP', 'signerAccount', 'listOfNodes']
          }
        },
        {
          name: 'remove_besu_network',
          description: 'Deletes an existing Hyperledger Besu network.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Network name to delete' }
            },
            required: ['name']
          }
        },
        {
          name: 'add_besu_node',
          description: 'Adds a node to an existing Besu network.',
          inputSchema: {
            type: 'object',
            properties: {
              networkName: { type: 'string', description: 'Network name' },
              nodeName: { type: 'string', description: 'Node name' },
              nodeType: { type: 'string', description: 'Node type (bootnode, miner, rpc, node)' },
              port: { type: 'string', description: 'Node port' },
              ip: { type: 'string', description: 'Node IP address (optional)' }
            },
            required: ['networkName', 'nodeName', 'nodeType', 'port']
          }
        },
        {
          name: 'remove_besu_node',
          description: 'Removes a node from an existing Besu network.',
          inputSchema: {
            type: 'object',
            properties: {
              networkName: { type: 'string', description: 'Network name' },
              nodeName: { type: 'string', description: 'Node name to remove' }
            },
            required: ['networkName', 'nodeName']
          }
        },
        {
          name: 'start_besu_network',
          description: 'Starts a Hyperledger Besu network.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Network name to start' }
            },
            required: ['name']
          }
        },
        {
          name: 'stop_besu_network',
          description: 'Stops a Hyperledger Besu network.',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Network name to stop' }
            },
            required: ['name']
          }
        },
        {
          name: 'get_besu_balance',
          description: 'Returns the balance of an address on a given Besu network.',
          inputSchema: {
            type: 'object',
            properties: {
              networkName: { type: 'string', description: 'Network name' },
              address: { type: 'string', description: 'Address to query' }
            },
            required: ['networkName', 'address']
          }
        },
        {
          name: 'list_networks',
          description: 'Lists all known Besu networks.',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ];
      console.log('[ai-chat] Calling OpenAIClient.analyzeBesuCommand...');
      aiDecision = await openaiClient.analyzeBesuCommand(message, safeHistory, toolsArray);
      console.log('[ai-chat] OpenAI response:', aiDecision);
    } catch (err) {
      console.error('[ai-chat] OpenAI error:', err);
      return res.status(500).json({ error: 'OpenAI error', details: err instanceof Error ? err.message : String(err) });
    }

    if (!aiDecision || !Array.isArray(aiDecision.actions)) {
      console.error('[ai-chat] Unexpected OpenAI response:', aiDecision);
      return res.status(500).json({ error: 'Unexpected OpenAI response', details: aiDecision });
    }

    // Execute actions decided by OpenAI via the MCP HTTP API
    const results = [];
    for (const action of aiDecision.actions) {
      try {
        console.log(`[ai-chat] Calling MCP for action:`, action);
        const mcpRes = await fetch('http://localhost:4000/api/mcp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: action.tool, args: action.parameters })
        });
        const result = await mcpRes.json();
        console.log(`[ai-chat] MCP result for ${action.tool}:`, result);
        results.push({
          tool: action.tool,
          success: mcpRes.ok && result.success,
          result: result.result ?? result,
          reason: action.reason
        });
      } catch (error) {
        console.error(`[ai-chat] MCP error for ${action.tool}:`, error);
        results.push({
          tool: action.tool,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          reason: action.reason
        });
      }
    }

    console.log('[ai-chat] Final results:', results);
    return res.status(200).json({
      response: formatFinalResponse(aiDecision, results)
    });
  } catch (error) {
    console.error('[ai-chat] General API error:', error);
    res.status(500).json({ error: 'Server error', details: error instanceof Error ? error.message : String(error) });
  }
}

function formatFinalResponse(aiDecision: any, results: any[]) {
  let response = `${aiDecision.userResponse}\n\n`;
  if (results.length > 0) {
    response += '📋 **Executed actions:**\n';
    results.forEach(result => {
      // Format the result for display
      let displayResult = result.result;
      if (typeof displayResult === 'object') {
        displayResult = JSON.stringify(displayResult, null, 2);
      }
      if (result.success) {
        response += `✅ **${result.tool}**: ${displayResult}\n`;
        response += `   └─ *Reason: ${result.reason}*\n\n`;
      } else {
        response += `❌ **${result.tool}**: Error - ${result.error}\n`;
        response += `   └─ *Reason: ${result.reason}*\n\n`;
      }
    });
  }
  return response;
}