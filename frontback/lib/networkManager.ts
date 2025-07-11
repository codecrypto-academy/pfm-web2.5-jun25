// Almacén en memoria para las redes gestionadas por el UI
// La clave es el ID único de la red, el valor es la instancia de Network
export const activeNetworks = new Map<string, any>();

// Referencia a la red por defecto (la del script.sh)
export let defaultNetwork: any | null = null;

// Función para registrar una red en el gestor
export function registerNetwork(networkId: string, network: any): void {
  activeNetworks.set(networkId, network);
}

// Función para obtener una red por ID
export function getNetwork(networkId: string): any | null {
  // Primero intentar buscar en las redes activas
  const network = activeNetworks.get(networkId);
  if (network) {
    return network;
  }
  
  // Si no se encuentra y coincide con IDs de red por defecto, devolver defaultNetwork
  if ((networkId === 'besu-local' || networkId === 'besu-local-env') && defaultNetwork) {
    return defaultNetwork;
  }
  
  return null;
}

// Función para eliminar una red del gestor
export function removeNetwork(networkId: string): boolean {
  return activeNetworks.delete(networkId);
}

// Función para obtener todas las redes registradas
export function getAllNetworks(): { id: string; network: any }[] {
  const networks: { id: string; network: any }[] = [];
  
  // Agregar la red por defecto si existe
  if (defaultNetwork) {
    networks.push({ id: 'besu-local', network: defaultNetwork });
  }
  
  // Agregar todas las redes activas
  for (const [id, network] of Array.from(activeNetworks)) {
    networks.push({ id, network });
  }
  
  return networks;
}

// Función para establecer la red por defecto
export function setDefaultNetwork(network: any): void {
  defaultNetwork = network;
}

// Función para obtener la red por defecto
export function getDefaultNetwork(): any | null {
  return defaultNetwork;
}