import { NextResponse } from 'next/server';
import { createBesuNodeManager } from 'besu-network-manager';
import { LogLevel } from 'besu-network-manager';

export async function POST(request: Request, { params }: { params: Promise<{ nodeId: string }> }) {
  try {
    const { nodeId } = await params;
    const { action, networkId } = await request.json();
    
    if (!action || !networkId) {
      return NextResponse.json(
        { error: 'Action and networkId are required' },
        { status: 400 }
      );
    }

    if (!['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, or restart' },
        { status: 400 }
      );
    }

    const nodeManager = createBesuNodeManager('./temp-nodes', LogLevel.INFO);
    
    let result;
    switch (action) {
      case 'start':
        await nodeManager.startExistingNode(nodeId, networkId);
        result = { message: `Node ${nodeId} started successfully` };
        break;
        
      case 'stop':
        await nodeManager.stopNode(nodeId);
        result = { message: `Node ${nodeId} stopped successfully` };
        break;
        
      case 'restart':
        await nodeManager.restartNode(nodeId, networkId);
        result = { message: `Node ${nodeId} restarted successfully` };
        break;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error managing node:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}