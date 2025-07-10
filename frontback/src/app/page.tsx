"use client";

import styles from "./page.module.css";
import { useState, useEffect } from "react";

interface NodeConfig {
  name: string;
  type: 'bootnode' | 'miner' | 'rpc';
  port: number;
  rpcPort?: number;
  ip: string;
}

const defaultConfig = {
  chainId: 2025,
  networkName: "besu-demo",
  subnet: "172.25.0.0/16",
  genesisConfig: {
    chainId: 2025,
    gasLimit: "0x1fffffffffffff",
    difficulty: "0x1",
    blockPeriodSeconds: 5,
    epochLength: 30000,
    alloc: {}
  }
};

// Estado inicial fijo para status
const initialStatus = {
  isRunning: false,
  totalNodes: 0,
  runningNodes: 0,
  nodes: [] as any[],
  signers: [] as any[],
};

export default function Home() {
  const [config, setConfig] = useState(defaultConfig);
  const [status, setStatus] = useState(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  
  // Estado para las tablas de nodos
  const [bootnodes, setBootnodes] = useState<NodeConfig[]>([
    { name: "bootnode-1", type: "bootnode", port: 30303, ip: "172.25.0.2" }
  ]);
  const [miners, setMiners] = useState<NodeConfig[]>([
    { name: "miner-1", type: "miner", port: 30304, ip: "172.25.0.3" }
  ]);
  const [rpcNodes, setRpcNodes] = useState<NodeConfig[]>([
    { name: "rpc-1", type: "rpc", port: 30305, rpcPort: 8545, ip: "172.25.0.4" }
  ]);

  // Cargar estado de la red solo en el cliente
  useEffect(() => {
    fetchStatus();
    // eslint-disable-next-line
  }, []);

  function validateConfig() {
    if (!config.chainId || isNaN(Number(config.chainId))) return "El chainId debe ser un número.";
    if (!config.networkName || config.networkName.length < 3) return "El nombre de la red debe tener al menos 3 caracteres.";
    if (!/^\d+\.\d+\.\d+\.\d+\/\d+$/.test(config.subnet)) return "El subnet debe tener formato válido (ej: 172.25.0.0/16).";
    if (bootnodes.length < 1) return "Se requiere al menos 1 bootnode.";
    if (miners.length < 1) return "Se requiere al menos 1 nodo minero.";
    if (rpcNodes.length < 1) return "Se requiere al menos 1 nodo RPC.";
    if (bootnodes.length > 5) return "Máximo 5 bootnodes.";
    if (miners.length > 10) return "Máximo 10 nodos mineros.";
    if (rpcNodes.length > 10) return "Máximo 10 nodos RPC.";
    return null;
  }

  function validateNode(node: NodeConfig, type: string): string | null {
    if (!node.name || node.name.trim() === "") return `El nombre del ${type} es obligatorio.`;
    if (!/^[a-zA-Z0-9-_]+$/.test(node.name)) return `El nombre del ${type} solo puede contener letras, números, guiones y guiones bajos.`;
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(node.ip)) return `La IP del ${type} debe tener formato válido (ej: 172.25.0.2).`;
    if (!node.port || isNaN(Number(node.port)) || Number(node.port) < 1024 || Number(node.port) > 65535) {
      return `El puerto del ${type} debe ser un número entre 1024 y 65535.`;
    }
    if (node.type === 'rpc' && (!node.rpcPort || isNaN(Number(node.rpcPort)) || Number(node.rpcPort) < 1024 || Number(node.rpcPort) > 65535)) {
      return `El RPC Port del ${type} debe ser un número entre 1024 y 65535.`;
    }
    return null;
  }

  // Funciones para manejar nodos
  const addBootnode = () => {
    const newIndex = bootnodes.length + 1;
    const baseIP = config.subnet.split('/')[0];
    const ipParts = baseIP.split('.').map(Number);
    const newIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${2 + bootnodes.length}`;
    const newPort = 30303 + bootnodes.length;
    
    setBootnodes([...bootnodes, {
      name: `bootnode-${newIndex}`,
      type: 'bootnode',
      port: newPort,
      ip: newIP
    }]);
  };

  const removeBootnode = (index: number) => {
    if (bootnodes.length > 1) {
      setBootnodes(bootnodes.filter((_, i) => i !== index));
    }
  };

  const updateBootnode = (index: number, field: keyof NodeConfig, value: any) => {
    const updated = [...bootnodes];
    updated[index] = { ...updated[index], [field]: value };
    setBootnodes(updated);
  };

  const addMiner = () => {
    const newIndex = miners.length + 1;
    const baseIP = config.subnet.split('/')[0];
    const ipParts = baseIP.split('.').map(Number);
    const newIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${2 + bootnodes.length + miners.length}`;
    const newPort = 30303 + bootnodes.length + miners.length;
    
    setMiners([...miners, {
      name: `miner-${newIndex}`,
      type: 'miner',
      port: newPort,
      ip: newIP
    }]);
  };

  const removeMiner = (index: number) => {
    if (miners.length > 1) {
      setMiners(miners.filter((_, i) => i !== index));
    }
  };

  const updateMiner = (index: number, field: keyof NodeConfig, value: any) => {
    const updated = [...miners];
    updated[index] = { ...updated[index], [field]: value };
    setMiners(updated);
  };

  const addRpcNode = () => {
    const newIndex = rpcNodes.length + 1;
    const baseIP = config.subnet.split('/')[0];
    const ipParts = baseIP.split('.').map(Number);
    const newIP = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.${2 + bootnodes.length + miners.length + rpcNodes.length}`;
    const newPort = 30303 + bootnodes.length + miners.length + rpcNodes.length;
    const newRpcPort = 8545 + rpcNodes.length;
    
    setRpcNodes([...rpcNodes, {
      name: `rpc-${newIndex}`,
      type: 'rpc',
      port: newPort,
      rpcPort: newRpcPort,
      ip: newIP
    }]);
  };

  const removeRpcNode = (index: number) => {
    if (rpcNodes.length > 1) {
      setRpcNodes(rpcNodes.filter((_, i) => i !== index));
    }
  };

  const updateRpcNode = (index: number, field: keyof NodeConfig, value: any) => {
    const updated = [...rpcNodes];
    updated[index] = { ...updated[index], [field]: value };
    setRpcNodes(updated);
  };

  const handleCreate = async () => {
    const validation = validateConfig();
    if (validation) {
      setConfigError(validation);
      return;
    }

    // Validar cada nodo individualmente
    for (let i = 0; i < bootnodes.length; i++) {
      const nodeError = validateNode(bootnodes[i], 'bootnode');
      if (nodeError) {
        setConfigError(`${nodeError} (${bootnodes[i].name})`);
        return;
      }
    }

    for (let i = 0; i < miners.length; i++) {
      const nodeError = validateNode(miners[i], 'minero');
      if (nodeError) {
        setConfigError(`${nodeError} (${miners[i].name})`);
        return;
      }
    }

    for (let i = 0; i < rpcNodes.length; i++) {
      const nodeError = validateNode(rpcNodes[i], 'RPC');
      if (nodeError) {
        setConfigError(`${nodeError} (${rpcNodes[i].name})`);
        return;
      }
    }

    setConfigError(null);
    setLoading(true);
    setError("");
    
    try {
      // Combinar todos los nodos
      const allNodes = [...bootnodes, ...miners, ...rpcNodes];
      
      const networkConfig = {
        ...config,
        nodes: allNodes
      };

      const res = await fetch("/api/network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: networkConfig })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert(`✅ ${data.message}`);
      await fetchStatus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar la red?')) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/network", { method: "DELETE" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setStatus(initialStatus);
      alert('✅ Red eliminada correctamente');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      console.log('✅ Prueba exitosa:', data.results);
      alert('Prueba completada exitosamente. Revisa la consola para más detalles.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanup = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar todas las configuraciones y contenedores? Esta acción no se puede deshacer.')) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/cleanup", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      alert(`Limpieza completada. Se eliminaron ${data.containersRemoved} contenedores.`);
      setStatus(initialStatus);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  async function fetchStatus() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/network");
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setStatus({
        isRunning: data.status?.isRunning ?? false,
        totalNodes: data.status?.totalNodes ?? 0,
        runningNodes: data.status?.runningNodes ?? 0,
        nodes: data.status?.nodes ?? [],
        signers: data.signers ?? [],
      });
    } catch (e: any) {
      setError(e.message);
      setStatus(initialStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Besu Network Manager</h1>
      
      <form className={styles.form} style={{ marginBottom: 16 }} onSubmit={e => { e.preventDefault(); handleCreate(); }}>
        <h2>Configuración de la Red</h2>
        
        <div className={styles.configSection}>
          <h3>Parámetros Básicos</h3>
          <label className={styles.label}>Chain ID</label>
          <input 
            className={styles.input} 
            type="number" 
            value={config.chainId} 
            onChange={e => setConfig({ ...config, chainId: Number(e.target.value) })} 
            required 
          />
          
          <label className={styles.label}>Nombre de la Red</label>
          <input 
            className={styles.input} 
            value={config.networkName} 
            onChange={e => setConfig({ ...config, networkName: e.target.value })} 
            required 
          />
          
          <label className={styles.label}>Subnet</label>
          <input 
            className={styles.input} 
            value={config.subnet} 
            onChange={e => setConfig({ ...config, subnet: e.target.value })} 
            required 
          />
        </div>

        <div className={styles.configSection}>
          <h3>Configuración de Nodos</h3>
          
          {/* Tabla de Bootnodes */}
          <div className={styles.nodeTableSection}>
            <div className={styles.tableHeader}>
              <h4>Bootnodes ({bootnodes.length})</h4>
              <button type="button" className={styles.addButton} onClick={addBootnode}>+ Agregar</button>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.nodeTable}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>IP</th>
                    <th>Puerto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {bootnodes.map((node, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className={styles.tableInput}
                          value={node.name}
                          onChange={(e) => updateBootnode(index, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          value={node.ip}
                          onChange={(e) => updateBootnode(index, 'ip', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          type="number"
                          value={node.port}
                          onChange={(e) => updateBootnode(index, 'port', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeBootnode(index)}
                          disabled={bootnodes.length <= 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de Mineros */}
          <div className={styles.nodeTableSection}>
            <div className={styles.tableHeader}>
              <h4>Nodos Mineros ({miners.length})</h4>
              <button type="button" className={styles.addButton} onClick={addMiner}>+ Agregar</button>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.nodeTable}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>IP</th>
                    <th>Puerto</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {miners.map((node, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className={styles.tableInput}
                          value={node.name}
                          onChange={(e) => updateMiner(index, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          value={node.ip}
                          onChange={(e) => updateMiner(index, 'ip', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          type="number"
                          value={node.port}
                          onChange={(e) => updateMiner(index, 'port', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeMiner(index)}
                          disabled={miners.length <= 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabla de Nodos RPC */}
          <div className={styles.nodeTableSection}>
            <div className={styles.tableHeader}>
              <h4>Nodos RPC ({rpcNodes.length})</h4>
              <button type="button" className={styles.addButton} onClick={addRpcNode}>+ Agregar</button>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.nodeTable}>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>IP</th>
                    <th>Puerto</th>
                    <th>RPC Port</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {rpcNodes.map((node, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          className={styles.tableInput}
                          value={node.name}
                          onChange={(e) => updateRpcNode(index, 'name', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          value={node.ip}
                          onChange={(e) => updateRpcNode(index, 'ip', e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          type="number"
                          value={node.port}
                          onChange={(e) => updateRpcNode(index, 'port', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <input
                          className={styles.tableInput}
                          type="number"
                          value={node.rpcPort || 8545}
                          onChange={(e) => updateRpcNode(index, 'rpcPort', Number(e.target.value))}
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => removeRpcNode(index)}
                          disabled={rpcNodes.length <= 1}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className={styles.configSection}>
          <h3>Parámetros de Genesis</h3>
          <label className={styles.label}>Período de Bloque (segundos)</label>
          <input 
            className={styles.input} 
            type="number" 
            min="1" 
            max="60"
            value={config.genesisConfig.blockPeriodSeconds} 
            onChange={e => setConfig({ 
              ...config, 
              genesisConfig: { 
                ...config.genesisConfig, 
                blockPeriodSeconds: Number(e.target.value) 
              } 
            })} 
            required 
          />
          
          <label className={styles.label}>Longitud de Época</label>
          <input 
            className={styles.input} 
            type="number" 
            min="1000" 
            max="100000"
            value={config.genesisConfig.epochLength} 
            onChange={e => setConfig({ 
              ...config, 
              genesisConfig: { 
                ...config.genesisConfig, 
                epochLength: Number(e.target.value) 
              } 
            })} 
            required 
          />
        </div>

        <div className={styles.buttonGroup}>
          <button className={styles.button} type="submit" disabled={loading}>Crear Red</button>
          <button className={styles.button} type="button" onClick={handleDelete} disabled={loading}>Eliminar Red</button>
          <button className={styles.button} type="button" onClick={fetchStatus} disabled={loading}>Actualizar Estado</button>
          <button className={styles.button} type="button" onClick={handleTest} disabled={loading}>Probar Creación</button>
          <button className={styles.button} type="button" onClick={handleCleanup} disabled={loading}>Limpiar Contenedores</button>
        </div>
      </form>
      
      {configError && <div className={styles.error}>{configError}</div>}
      
      <hr style={{ margin: "24px 0" }} />
      
      {/* Eliminar toda la sección de Estado de la Red y referencias a total de nodos */}
    </main>
  );
}
