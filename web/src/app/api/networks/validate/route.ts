import { NextRequest, NextResponse } from 'next/server';
import { networkManagerService } from '@/lib/networkManager';
import type { BesuNetworkConfig, ValidationOptions } from '@/lib/networkManager';

/**
 * POST /api/networks/validate - Validate a network configuration
 * This endpoint allows clients to validate network configurations before creating them
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.networkId) {
      return NextResponse.json(
        { success: false, error: 'networkId is required' },
        { status: 400 }
      );
    }

    if (!body.chainId) {
      return NextResponse.json(
        { success: false, error: 'chainId is required' },
        { status: 400 }
      );
    }

    // Extract validation options from request
    const validationOptions: Partial<ValidationOptions> = {
      checkChainIdConflicts: body.validation?.checkChainIdConflicts ?? true,
      checkSubnetOverlaps: body.validation?.checkSubnetOverlaps ?? true,
      checkNameConflicts: body.validation?.checkNameConflicts ?? true,
      checkPortConflicts: body.validation?.checkPortConflicts ?? true,
      checkDockerNetworkConflicts: body.validation?.checkDockerNetworkConflicts ?? true,
      checkBasicFormat: body.validation?.checkBasicFormat ?? true,
      checkExistingNetworkId: body.validation?.checkExistingNetworkId ?? true,
      warningsOnly: body.validation?.warningsOnly ?? false,
      detailedErrors: body.validation?.detailedErrors ?? true
    };

    // Create network configuration
    const networkConfig: BesuNetworkConfig = {
      networkId: body.networkId,
      chainId: body.chainId,
      subnet: body.subnet || '172.25.0.0/24',
      name: body.name || `besu-${body.networkId}`,
      besuVersion: body.besuVersion || 'latest',
      nodes: body.nodes || [],
      genesis: body.genesis || {},
      env: body.env || {}
    };

    // Perform validation only (dry run)
    const manager = await networkManagerService.getManager();
    
    // Get current validation options
    const originalOptions = manager.getValidationOptions();
    
    // Temporarily set validation options
    manager.setValidationOptions({ ...originalOptions, ...validationOptions });
    
    let validationResult = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      suggestions: null as any
    };

    try {
      // Test validation by trying to create config with defaults and validate
      const configWithDefaults = (manager as any).applyConfigDefaults(networkConfig);
      await (manager as any).validateConfig(configWithDefaults);
      
      validationResult.valid = true;
    } catch (error) {
      validationResult.valid = false;
      validationResult.errors.push(error instanceof Error ? error.message : String(error));
      
      // Get suggestions for resolving conflicts
      try {
        validationResult.suggestions = manager.getSuggestedAlternatives(networkConfig);
      } catch (suggestionError) {
        // Suggestions are optional
      }
    } finally {
      // Restore original validation options
      manager.setValidationOptions(originalOptions);
    }

    return NextResponse.json({
      success: true,
      validation: validationResult,
      config: networkConfig
    });

  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate network configuration'
      },
      { status: 500 }
    );
  }
}
