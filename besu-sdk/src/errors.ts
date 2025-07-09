/**
 * Custom error classes for the Besu SDK
 * 
 * These specialized error types enable precise error handling throughout
 * the SDK, making it clear what went wrong and allowing consumers to
 * handle different failure scenarios appropriately.
 */

/**
 * Base error class for all SDK-specific errors
 * 
 * Extends the standard Error class to provide a common ancestor
 * for all custom errors, enabling catch-all error handling when needed.
 */
export class BesuSDKError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Thrown when attempting to remove the last validator from a network
 * 
 * Clique consensus requires at least one validator to produce blocks.
 * This error prevents accidental network halts by blocking removal
 * of the final validator node.
 */
export class LastValidatorRemovalError extends BesuSDKError {
  constructor(validatorName: string) {
    super(
      `Cannot remove validator '${validatorName}' as it is the last validator. ` +
      `Clique networks require at least one validator to function.`
    );
  }
}

/**
 * Thrown when an operation is attempted in an invalid network state
 * 
 * The network follows a strict state machine, and certain operations
 * are only valid in specific states. This error indicates a state
 * precondition was not met.
 */
export class InvalidNetworkStateError extends BesuSDKError {
  constructor(operation: string, currentState: string, requiredStates?: string[]) {
    const stateInfo = requiredStates 
      ? ` Required states: ${requiredStates.join(', ')}`
      : '';
    super(
      `Cannot perform operation '${operation}' in current state '${currentState}'.${stateInfo}`
    );
  }
}

/**
 * Thrown when an operation is attempted on a node in an invalid state
 * 
 * Similar to InvalidNetworkStateError but for individual node operations.
 * Ensures node-level state machine integrity.
 */
export class InvalidNodeStateError extends BesuSDKError {
  constructor(nodeName: string, operation: string, currentState: string) {
    super(
      `Cannot perform operation '${operation}' on node '${nodeName}' ` +
      `in current state '${currentState}'.`
    );
  }
}

/**
 * Thrown when a requested node cannot be found in the network
 * 
 * Indicates an attempt to access or manipulate a node that doesn't
 * exist in the current network configuration.
 */
export class NodeNotFoundError extends BesuSDKError {
  constructor(nodeName: string) {
    super(`Node '${nodeName}' not found in the network.`);
  }
}

/**
 * Thrown when attempting to create a network with a name that already exists
 * 
 * Docker network names must be unique. This error prevents conflicts
 * and helps maintain clean resource management.
 */
export class NetworkAlreadyExistsError extends BesuSDKError {
  constructor(networkName: string) {
    super(
      `A network named '${networkName}' already exists. ` +
      `Please choose a different name or remove the existing network.`
    );
  }
}

/**
 * Thrown when the system lacks resources to create the requested network
 * 
 * Large networks require significant CPU, memory, and disk resources.
 * This error indicates the requested configuration exceeds available capacity.
 */
export class InsufficientResourcesError extends BesuSDKError {
  constructor(resource: string, required: string, available: string) {
    super(
      `Insufficient ${resource}: required ${required}, available ${available}. ` +
      `Consider reducing the number of nodes or increasing system resources.`
    );
  }
}

/**
 * Thrown when Docker daemon is not accessible
 * 
 * The SDK requires Docker to be installed and running. This error
 * provides clear guidance on resolving Docker connectivity issues.
 */
export class DockerNotAvailableError extends BesuSDKError {
  constructor(details?: string) {
    const baseMessage = 'Docker daemon is not accessible.';
    const troubleshooting = 
      'Ensure Docker is installed and running. ' +
      'On Linux, you may need to add your user to the docker group.';
    super(`${baseMessage} ${details || ''} ${troubleshooting}`);
  }
}

/**
 * Thrown when configuration validation fails
 * 
 * Indicates that provided configuration doesn't meet the requirements
 * for creating a valid Besu network. Includes specific validation details.
 */
export class ConfigurationValidationError extends BesuSDKError {
  constructor(field: string, issue: string, value?: any) {
    const valueInfo = value !== undefined ? ` (provided: ${JSON.stringify(value)})` : '';
    super(`Configuration validation failed for '${field}': ${issue}${valueInfo}`);
  }
}

/**
 * Thrown when a file system operation fails
 * 
 * Wraps lower-level file system errors with context about what
 * operation was being attempted for better debugging.
 */
export class FileSystemError extends BesuSDKError {
  constructor(operation: string, path: string, originalError?: Error) {
    const details = originalError ? `: ${originalError.message}` : '';
    super(`File system operation '${operation}' failed for path '${path}'${details}`);
  }
}

/**
 * Thrown when attempting to use an IP address that's already assigned
 * 
 * Each node in the network must have a unique IP address within
 * the Docker subnet to ensure proper communication.
 */
export class IPAddressConflictError extends BesuSDKError {
  constructor(ip: string, existingNode: string) {
    super(
      `IP address '${ip}' is already assigned to node '${existingNode}'. ` +
      `Each node must have a unique IP address within the network subnet.`
    );
  }
}

/**
 * Thrown when a Docker operation fails
 * 
 * Wraps Docker API errors with additional context about the operation
 * being performed, making troubleshooting easier.
 */
export class DockerOperationError extends BesuSDKError {
  constructor(operation: string, details: string, originalError?: Error) {
    const errorDetails = originalError ? ` Original error: ${originalError.message}` : '';
    super(`Docker operation '${operation}' failed: ${details}.${errorDetails}`);
  }
}

/**
 * Thrown when attempting to add a node with a name that already exists
 * 
 * Node names must be unique within a network to enable clear
 * identification and management.
 */
export class DuplicateNodeNameError extends BesuSDKError {
  constructor(nodeName: string) {
    super(
      `A node named '${nodeName}' already exists in the network. ` +
      `Node names must be unique.`
    );
  }
}

/**
 * Thrown when attempting to create a network with a chain ID that is already
 * in use by another managed network.
 */
export class ChainIdConflictError extends BesuSDKError {
  constructor(chainId: number, existingNetworkName: string) {
    super(
      `Chain ID ${chainId} is already in use by network '${existingNetworkName}'. ` +
      `Each network must have a unique chain ID to avoid conflicts.`
    );
  }
}

/**
 * Thrown when attempting to create a network with a subnet that is already
 * in use by an existing Docker network.
 */
export class SubnetConflictError extends BesuSDKError {
  constructor(subnet: string, existingNetworkName: string) {
    super(
      `Subnet ${subnet} is already in use by Docker network '${existingNetworkName}'. ` +
      `Docker routing issues can occur with duplicate subnets. Please use a different subnet.`
    );
  }
}

/**
 * Thrown when a requested network cannot be found.
 *
 * Typically occurs when trying to adopt or manage a network by a name
 * that does not exist in Docker.
 */
export class NetworkNotFoundError extends BesuSDKError {
  constructor(networkName: string) {
    super(`Network '${networkName}' not found while trying to adopt it.`);
  }
}

/**
 * Thrown when a container fails to reach a desired state within the timeout.
 */
export class ContainerStateTimeoutError extends BesuSDKError {
  constructor(containerName: string, desiredState: string, timeout: number) {
    super(
      `Timeout (${timeout}ms) waiting for container '${containerName}' to reach state '${desiredState}'.`
    );
  }
}

/**
 * Thrown when a container enters an unexpected or failed state (e.g., 'exited', 'dead').
 */
export class UnexpectedContainerStateError extends BesuSDKError {
  constructor(containerName: string, unexpectedState: string) {
    super(
      `Container '${containerName}' entered an unexpected state: '${unexpectedState}'. The container may have crashed.`
    );
  }
}

/**
 * Thrown when required Besu Docker image is not available
 * 
 * The SDK needs the Hyperledger Besu Docker image to create nodes.
 * This error indicates the image couldn't be found or pulled.
 */
export class BesuImageNotFoundError extends BesuSDKError {
  constructor(imageName: string) {
    super(
      `Besu Docker image '${imageName}' not found. ` +
      `The SDK will attempt to pull it automatically, but this requires internet access.`
    );
  }
}

/**
 * Thrown when network initialization times out
 * 
 * Complex networks may take time to initialize. This error indicates
 * the process exceeded the expected timeframe, suggesting potential issues.
 */
export class NetworkInitializationTimeoutError extends BesuSDKError {
  constructor(timeoutSeconds: number) {
    super(
      `Network initialization did not complete within ${timeoutSeconds} seconds. ` +
      `This may indicate resource constraints or Docker performance issues.`
    );
  }
}

/**
 * Thrown when RPC port is already in use
 * 
 * RPC ports must be available on the host system. This error helps
 * identify port conflicts before container creation fails.
 */
export class PortAlreadyInUseError extends BesuSDKError {
  constructor(port: number, nodeName: string) {
    super(
      `Port ${port} is already in use and cannot be assigned to node '${nodeName}'. ` +
      `Please choose a different port or free up the existing one.`
    );
  }
}