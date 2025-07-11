import { NextResponse } from 'next/server';
import { BesuNetworkBuilder } from 'besu-sdk';
import { promises as fs } from 'fs';
import * as path from 'path';
interface NetworkNode {
  name: string;
  ip: string;
  validator: boolean;
  rpc: boolean;
  rpcPort?: number;
  balance: string;
}

export async function POST(request: Request) {
  const { name, chainId, subnet, nodes, prefunds } = await request.json();

  console.log(`[API] Received request to create custom network: ${name}`);
  
  if (!name || !chainId || !subnet || !nodes) {
    return NextResponse.json({ error: 'Missing required fields for custom network creation.' }, { status: 400 });
  }

  const networkId = name.toLowerCase().replace(/\s+/g, '-');
  const networksDir = path.join(process.cwd(), 'app', 'networks');
  const finalNetworkJsonPath = path.join(networksDir, `${networkId}.json`);

  try {
    await fs.access(finalNetworkJsonPath);
    console.log(`[API] Network configuration '${networkId}.json' already exists.`);
    return NextResponse.json({ error: `Network '${name}' already exists.` }, { status: 409 });
  } catch (error) {
    // File doesn't exist, proceed.
  }

  const tempDataDir = path.join(process.cwd(), '.tmp_besu_sdk_custom');

  try {
    console.log('[API] Initializing BesuNetworkBuilder for custom network...');
    const builder = new BesuNetworkBuilder()
      .withNetworkName(networkId)
      .withChainId(chainId)
      .withBlockPeriod(2) // Default value, could be customized in the future
      .withSubnet(subnet)
      .withDataDirectory(tempDataDir);

    // Add nodes from the request
    for (const node of nodes as NetworkNode[]) {
      if (node.validator) {
        builder.addValidator(node.name, node.ip, { initialBalance: node.balance });
      } else {
        builder.addNode(node.name, node.ip, { 
          rpc: node.rpc, 
          rpcPort: node.rpcPort, 
          initialBalance: node.balance 
        });
      }
    }
    
    // The SDK handles pre-funding through node balances, if we wanted to add more complex pre-funds later, 
    // we would need to modify the genesis file generation within the SDK.
    // For now, balances on nodes cover the 'prefunds' concept.

    await builder.build();

    console.log('[API] Custom Besu network built and started successfully.');

    const sdkGeneratedJsonPath = path.join(tempDataDir, networkId, 'network.json');
    const networkJsonContent = await fs.readFile(sdkGeneratedJsonPath, 'utf-8');
    
    await fs.mkdir(networksDir, { recursive: true });
    await fs.writeFile(finalNetworkJsonPath, networkJsonContent);

    await fs.rm(tempDataDir, { recursive: true, force: true });
    
    console.log('[API] Custom network creation process completed successfully.');
    return NextResponse.json({ message: 'Custom network created successfully', network: JSON.parse(networkJsonContent) });

  } catch (err: any) {
    console.error('[API] Error during custom network creation:', err);
    
    try {
      await fs.rm(tempDataDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error('[API] Failed to cleanup temp directory after an error:', cleanupError);
    }

    return NextResponse.json(
      { error: 'Failed to create custom network', details: err.message },
      { status: 500 }
    );
  }
}