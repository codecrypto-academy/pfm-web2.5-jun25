import OpenAI from 'openai';

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeBesuCommand(
    userMessage: string,
    conversationHistory: any[],
    availableTools: any[]
  ) {
    const systemPrompt = `You are an expert in Hyperledger Besu blockchain networks.

Available tools:
${availableTools.map(tool => `
**${tool.name}**: ${tool.description}
Parameters: ${JSON.stringify(tool.inputSchema.properties, null, 2)}
`).join('\n')}

Important rules:
1. Analyze the user's request
2. Ask the user for any missing information
3. Choose the appropriate tools
4. Determine the optimal parameters
5. Explain your choices
6. Execute the actions in the correct order

If a parameter is not provided by the user, apply these rules:
- For the bootnode, use the IP address ending with .10.
- For the first validator address (signerAddress), use the value from the "address" file found in one of the directories inside networks/Keypair.
- For chainId, use a unique value not already used by other networks.
- For subnet, use a subnet not already used by other networks in the range 192.168.x.x/24 or 10.x.x.x/16.
- For prefunded addresses, use: 0x6243A64dd2E56F164E1f08e99433A7DEC132AB4E with an amount of 10000.
- Node IP addresses must be within the network's subnet (CIDR), and the CIDR (Subnet) parameter must match the network's subnet.
- When creating a new network, use an unused subnet (not already assigned to another network).
- When creating a new node, use a free port that is not already in use.
- For a new Miner node, use IP addresses in the .20-.29 range. The name must be minerX where X is the node port.
- For a new RPC node, use IP addresses in the .30-.39 range. The name must be rpcX where X is the node port.
- For a new Fullnode (Node), use IP addresses in the .40-.49 range. The name must be nodeX where X is the node number.

Response format (JSON only):
{
  "analysis": "Your detailed analysis",
  "actions": [
    {
      "tool": "tool_name",
      "parameters": { "param": "value" },
      "reason": "Justification"
    }
  ],
  "userResponse": "Friendly message for the user"
}
  
IMPORTANT: Reply ONLY with a valid JSON object matching the format above. Do not include any explanation or markdown, only the JSON.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: userMessage }
    ];

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 1200,
      response_format: { type: 'json_object' } // Force JSON format
    });

    // Robust JSON parsing
    let content = completion.choices[0].message.content;
    if (!content) {
      return { error: 'No content returned by OpenAI', raw: null };
    }
    try {
      return JSON.parse(content);
    } catch (e) {
      return { error: 'Invalid JSON response', raw: content };
    }
  }

  async generateSmartParameters(networkType: string, requirements: string[]) {
    const prompt = `Generate optimal parameters for a Hyperledger Besu network.

Type: ${networkType}
Requirements: ${requirements.join(', ')}

Reply with a JSON containing the recommended parameters:
{
  "nodeCount": number,
  "chainId": number,
  "consensus": "string",
  "blockTime": number,
  "gasLimit": number,
  "reasoning": "Explanation of the choices"
}`;

    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
      response_format: { type: 'json_object' }
    });

    // Robust JSON parsing
    let content = completion.choices[0].message.content;
    if (!content) {
      return { error: 'No content returned by OpenAI', raw: null };
    }
    try {
      return JSON.parse(content);
    } catch (e) {
      // Try to extract JSON from the text
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (e2) {
          return { error: 'Invalid JSON response', raw: content };
        }
      }
      return { error: 'Invalid JSON response', raw: content };
    }
  }
}