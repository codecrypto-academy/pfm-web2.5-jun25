"use client";
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { HoldToConfirmButton } from "../../components/ui/HoldToConfirmButton";
import { createBesuNetwork, removeBesuNetwork, addBesuNode, removeBesuNode, getNetworksForLocalStorage } from "@/lib/actions";
import { Network, Node, PrefundedAccount } from "../../types/network";
import { Plus, Trash2, Network as NetworkIcon, Settings, Coins, ExternalLink } from "lucide-react";

// Utility functions for validation
function isValidIP(ip: string): boolean {
  const ipRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}
function isValidCIDR(cidr: string): boolean {
  const cidrRegex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\/(\d|[1-2]\d|3[0-2]))$/;
  return cidrRegex.test(cidr);
}
function isIPInSubnet(ip: string, cidr: string): boolean {
  if (!isValidIP(ip) || !isValidCIDR(cidr)) return false;
  const [subnet, mask] = cidr.split('/');
  const maskBits = parseInt(mask);
  const ipToNumber = (ip: string) => ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  const ipNum = ipToNumber(ip);
  const subnetNum = ipToNumber(subnet);
  const maskNum = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
  return (ipNum & maskNum) === (subnetNum & maskNum);
}
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
function getLocalNetworks(): Network[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem("networks");
  return data ? JSON.parse(data) : [];
}
function setLocalNetworks(networks: Network[]) {
  localStorage.setItem("networks", JSON.stringify(networks));
}
/*function getUniqueChainId(desiredId: number, existingNetworks: Network[]): number {
  let id = desiredId;
  const used = new Set(existingNetworks.map(n => Number(n.chainId)));
  while (used.has(id)) {
    id++;
  }
  return id;
}*/

// Get the last used port from localStorage, or initialize to 18564
function getLastUsedPort(): number {
  if (typeof window === "undefined") return 18564;
  const stored = localStorage.getItem("lastPort");
  return stored ? parseInt(stored, 10) : 18564;
}
// Set the last used port in localStorage
function setLastUsedPort(port: number) {
  if (typeof window !== "undefined") {
    localStorage.setItem("lastPort", port.toString());
  }
}

/*function getNextAvailablePort(existingNodes: Node[]): number {
  // Search for the next available port
  const usedPorts = existingNodes.map(n => n.port).filter(Boolean);
  return usedPorts.length > 0 ? Math.max(...usedPorts) + 1 : 18565;
}*/

export default function NetworksPage() {
  const [networks, setNetworks] = useState<Network[]>([]);
  const [editing, setEditing] = useState<Network | null>(null);
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  // Synchronise localStorage with MongoDB on each page load or tab return
  useEffect(() => {
    const syncNetworks = async () => {
      const mongoNetworks = await getNetworksForLocalStorage();
      setNetworks(mongoNetworks);
      setLocalNetworks(mongoNetworks);
    };

    syncNetworks();

    // Synchronise with tab return
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncNetworks();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Add a CSS rule to the body element to increase the minimum width of the browser window
  React.useEffect(() => {
    const prevMinWidth = document.body.style.minWidth;
    document.body.style.minWidth = '600px'; // default value 500px + 100px
    return () => { document.body.style.minWidth = prevMinWidth; };
  }, []);

  // Network management
  function handleSave(network: Omit<Network, "id">, id?: string) {
    let updated: Network[];
    if (id) {
      updated = networks.map((n) => (n.id === id ? { ...network, id } : n));
    } else {
      updated = [...networks, { ...network, id: uuidv4() }];
    }
    setNetworks(updated);
    setLocalNetworks(updated);
    setShowForm(false);
    setEditing(null);
  }
  function handleDelete(id: string) {
    const updated = networks.filter((n) => n.id !== id);
    setNetworks(updated);
    setLocalNetworks(updated);
    const deletedNetwork = networks.find((n) => n.id === id);
    const networkName = deletedNetwork?.network;
    if (networkName) {
      removeBesuNetwork(networkName.replace(/\s/g, "")).catch((error) => {
        console.error("Error removing Besu network:", error);
      });
    }
  }
  // Main design
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <NetworkIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-800">Blockchain Network Configuration</h1>
          </div>
          <p className="text-gray-600 mb-8">Configure your private Hyperledger Besu network</p>
        </div>
        {/* Animated Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              key={editing?.id || "new"}
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="mt-10"
            >
              <NetworkForm
                initial={editing || undefined}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); }}
                isEditing={!!editing}
              />
            </motion.div>
          )}
        </AnimatePresence>
        {/* Button to create a new network */}
        {!showForm && (
          <div className="flex justify-end mb-6">
            <Button onClick={() => { setShowForm(true); setEditing(null); }}>
              New Network
            </Button>
          </div>
        )}
        {/* List of existing networks */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Created Networks</h3>
          {networks.length === 0 ? (
            <div className="text-gray-500">No network created yet.</div>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {networks.map((network) => (
                <div key={network.id} className="border rounded-lg p-4 shadow bg-gray-50 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={() => router.push(`/networks/${network.id}`)}
                      className="font-bold text-lg text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-2"
                    >
                      {network.network}
                      <ExternalLink className="h-4 w-4" />
                    </button>
                  </div>
                  <div><b>ChainID:</b> {network.chainId}</div>
                  <div><b>IP:</b> {network.ip}</div>
                  <div><b>CIDR (Subnet):</b> {network.cidr}</div>
                  <div><b>Signer:</b> {network.signerAccount}</div>
                  <div><b>Auto-Signer:</b> {network.autoSigner ? 'Enabled' : 'Disabled'}</div>
                  <div><b>Prefunded:</b> {network.prefundedAccounts.length}</div>
                  <div className="mb-2">
                    <b>Prefunded accounts:</b>
                    <ul className="ml-4">
                      {network.prefundedAccounts.map((acc, i) => (
                        <li key={i} className="text-xs">
                          {acc.address} - {acc.amount}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div><b>Nodes:</b> {network.nodes.length}</div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      className="h-10 px-4 py-2 flex items-center"
                      onClick={() => { setEditing(network); setShowForm(true); }}>
                      Edit
                    </Button>
                    <HoldToConfirmButton
                      onHold={() => handleDelete(network.id)}
                      className="h-10 px-4 py-2 flex items-center bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400">
                      Delete
                    </HoldToConfirmButton>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NetworkForm({ initial, onSave, onCancel, isEditing }: {
  initial?: Network,
  onSave: (network: Omit<Network, "id">, id?: string) => void,
  onCancel: () => void,
  isEditing: boolean,
}) {
  const [network, setNetwork] = useState(initial?.network || "");
  const [cidr, setCidr] = useState(initial?.cidr || "");
  const [ip, setIp] = useState(initial?.ip || "");
  const [chainId, setChainId] = useState(() => {
    if (initial?.chainId) return initial.chainId.toString();
    // Find unique chainId for new network
    if (typeof window !== "undefined") {
      const data = localStorage.getItem("networks");
      const networks: Network[] = data ? JSON.parse(data) : [];
      let candidate = 1337;
      const used = new Set(networks.map(n => Number(n.chainId)));
      while (used.has(candidate)) candidate++;
      return candidate.toString();
    }
    return "1337";
  });
  const [signerAccount, setSignerAccount] = useState(initial?.signerAccount || "");
  const [autoSigner, setAutoSigner] = useState(initial?.autoSigner ?? false);
  const [prefundedAccounts, setPrefundedAccounts] = useState<PrefundedAccount[]>(
    initial?.prefundedAccounts?.length
      ? initial.prefundedAccounts
      : [{ address: "", amount: "10000" }]
  );
  const [nodes, setNodes] = useState<Node[]>(
    initial?.nodes?.length
      ? initial.nodes
      : [{ type: "rpc", ip: "", name: "rpc18565", port: 18565 }]
  );
  // Port state to ensure global uniqueness
  const [lastPort, setLastPortState] = useState(() => getLastUsedPort());

  // Validation errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isLoading, setIsLoading] = useState(false);

  // Real-time validation
  const validateField = (field: string, value: string | number) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'ip':
        if (!isValidIP(value as string)) {
          newErrors.ip = "Invalid IP address";
        } else if (cidr && !isIPInSubnet(value as string, cidr)) {
          newErrors.ip = "IP must be within the specified subnet";
        } else {
          delete newErrors.ip;
        }
        break;
        
      case 'cidr':
        if (!isValidCIDR(value as string)) {
          newErrors.cidr = "Invalid CIDR format (e.g., 192.168.0.0/24)";
        } else if (ip && !isIPInSubnet(ip, value as string)) {
          newErrors.cidr = "Subnet must contain the main IP";
        } else {
          delete newErrors.cidr;
        }
        break;
        
      case 'chainId':
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          newErrors.chainId = "Chain ID must be a positive number";
        } else {
          delete newErrors.chainId;
        }
        break;
        
      case 'signerAccount':
        if (!isValidEthereumAddress(value as string)) {
          newErrors.signerAccount = "Invalid Ethereum address";
        } else {
          delete newErrors.signerAccount;
        }
        break;
    }
    
    setErrors(newErrors);
  };

  // Validation for node IPs
  const validateNodeIP = (nodeIndex: number, ip: string) => {
    const newErrors = { ...errors };
    const errorKey = `node_${nodeIndex}`;
    if (!isValidIP(ip)) {
      newErrors[errorKey] = "Invalid IP address";
    } else if (cidr && !isIPInSubnet(ip, cidr)) {
      newErrors[errorKey] = "IP must be within the specified subnet";
    } else {
      delete newErrors[errorKey];
    }
    setErrors(newErrors);
  };

  const validatePrefundedAccount = (accountIndex: number, field: 'address' | 'amount', value: string) => {
    const newErrors = { ...errors };
    const errorKey = `prefunded_${accountIndex}_${field}`;
    
    if (field === 'address') {
      if (!isValidEthereumAddress(value)) {
        newErrors[errorKey] = "Invalid Ethereum address";
      } else {
        delete newErrors[errorKey];
      }
    } else if (field === 'amount') {
      if (!value || isNaN(Number(value)) || Number(value) <= 0) {
        newErrors[errorKey] = "Invalid amount";
      } else {
        delete newErrors[errorKey];
      }
    }
    
    setErrors(newErrors);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length > 0) return;

    // Generate nodes with stable names and ports based on the initial nodes
    // Always assign a new port and name for new nodes (including type/IP changes)
    const generateNodesWithStableNamePort = (inputNodes: Node[], oldNodes: Node[] = []) => {
      let portCounter = lastPort;
      // For each input node, if it matches an old node by name, keep name/port; else assign new
      return inputNodes.map((n) => {
        const found = oldNodes.find(o => o.name === n.name && o.type === n.type && o.ip === n.ip);
        if (found) {
          return { ...n, name: found.name, port: found.port };
        }
        portCounter++;
        return { ...n, name: n.type + portCounter, port: portCounter };
      });
    };

    if (isEditing && initial) {
      setIsLoading(true);
      const oldNodes = initial.nodes || [];
      // Generate new nodes with stable names and ports
      const newNodes = generateNodesWithStableNamePort(nodes, oldNodes);
      // Find the highest port used in this operation
      let maxPort = lastPort;
      newNodes.forEach(n => { if (n.port > maxPort) maxPort = n.port; });
      setLastUsedPort(maxPort);
      setLastPortState(maxPort);
      let error = null;
      // --- Node diff logic ---
      // Remove nodes that are missing or whose type or IP has changed
      for (const oldNode of oldNodes) {
        const newNode = newNodes.find(n => n.name === oldNode.name);
        if (!newNode || newNode.ip !== oldNode.ip || newNode.type !== oldNode.type) {
          const res = await removeBesuNode(network.replace(/\s/g, ''), oldNode.name);
          if (!res?.success) error = res?.error || 'Error when deleting a node.';
        }
      }
      // Add nodes that are new or whose type or IP has changed
      for (const newNode of newNodes) {
        const oldNode = oldNodes.find(o => o.name === newNode.name);
        if (!oldNode || oldNode.ip !== newNode.ip || oldNode.type !== newNode.type) {
          const res = await addBesuNode(network.replace(/\s/g, ''), newNode.name, newNode.type, newNode.port.toString(), newNode.ip);
          if (!res?.success) error = res?.error || 'Error when adding a node.';
        }
      }
      setIsLoading(false);
      if (error) {
        alert(error);
        return;
      }
      onSave({ network, cidr, ip, chainId: Number(chainId), signerAccount, autoSigner, prefundedAccounts, nodes: newNodes}, initial.id);
      return;
    }
    if (!initial?.id) {
      setIsLoading(true);
      let uniqueChainId = Number(chainId);
      const used = getLocalNetworks().map(n => Number(n.chainId));
      while (used.includes(uniqueChainId)) {
        uniqueChainId++;
      }
      if (uniqueChainId !== Number(chainId)) {
        alert(`Chain ID ${chainId} already used. Using ${uniqueChainId} instead.`);
      }
      // Generate list of nodes with stable names and ports
      const stableNodes = generateNodesWithStableNamePort(nodes);
      const result = await createBesuNetwork(
        network.replace(/\s/g, ""),
        uniqueChainId,
        cidr,
        ip,
        signerAccount,
        stableNodes.map(n => ({
          nodeType: n.type,
          ip: n.ip,
          name: n.name,
          port: n.port
        })),
        prefundedAccounts.map(p => ({ address: p.address, amount: p.amount })),
        autoSigner,
        getLocalNetworks().length
      );
      setIsLoading(false);
      if (!result?.success) {
        alert(result?.error || 'Erreur lors de la création du réseau Besu.');
        return;
      }
      // Update localStorage with the correct list of nodes
      onSave({ network, cidr, ip, chainId: uniqueChainId, signerAccount, autoSigner, prefundedAccounts, nodes: stableNodes }, initial?.id);
    } else {
      onSave({ network, cidr, ip, chainId: Number(chainId), signerAccount, autoSigner, prefundedAccounts, nodes }, initial?.id);
    }
  }

  // Function to handle the next available port 
  function getNextPortAndIncrement() {
    const last = getLastUsedPort();
    const next = last + 1;
    setLastUsedPort(next);
    return next;
  }

  // Add a new node with a unique port
  function handleAddNode() {
    const port = getNextPortAndIncrement();
    setNodes(prev => [...prev, { type: "rpc", ip: "", name: `rpc${port}`, port }]);
  }

  // Replace a node when changing type or IP
  function handleNodeChange(index: number, field: 'type' | 'ip', value: string) {
    setNodes(prev => {
      const copy = [...prev];
      const port = getNextPortAndIncrement();
      const type = field === 'type' ? value as Node['type'] : copy[index].type;
      const ip = field === 'ip' ? value : copy[index].ip;
      // Replace a old node with a new one with the new port and name
      copy[index] = { type, ip, name: `${type}${port}`, port };
      return copy;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Configuration */}
      {!isEditing && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <Settings style={{ color: '#2563eb' }} className="h-6 w-6" />
            <h2 style={{ color: '#1e293b' }} className="text-xl font-semibold">Basic Configuration</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label style={{ color: '#334155' }} className="block text-sm font-medium mb-2">Network name</label>
              <input 
                value={network} 
                onChange={e => setNetwork(e.target.value)}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12 }}
                className="w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                disabled={isEditing}
                required 
              />
            </div>
            <div>
              <label style={{ color: '#334155' }} className="block text-sm font-medium mb-2">Chain ID</label>
              <input 
                value={chainId} 
                onChange={e => {
                  setChainId(e.target.value);
                  validateField('chainId', e.target.value);
                }}
                type="number" 
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12 }}
                className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.chainId ? 'border-red-500' : ''}`}
                disabled={isEditing}
                required 
              />
              {errors.chainId && <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors.chainId}</p>}
            </div>
            <div>
              <label style={{ color: '#334155' }} className="block text-sm font-medium mb-2">Subnet (CIDR)</label>
              <input 
                value={cidr} 
                onChange={e => {
                  setCidr(e.target.value);
                  validateField('cidr', e.target.value);
                }}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12 }}
                className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.cidr ? 'border-red-500' : ''}`}
                placeholder="192.168.0.0/24" 
                disabled={isEditing}
                required 
              />
              {errors.cidr && <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors.cidr}</p>}
            </div>
            <div>
              <label style={{ color: '#334155' }} className="block text-sm font-medium mb-2">Main IP address</label>
              <input 
                value={ip} 
                onChange={e => {
                  setIp(e.target.value);
                  validateField('ip', e.target.value);
                }}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12 }}
                className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.ip ? 'border-red-500' : ''}`}
                placeholder="192.168.0.10" 
                disabled={isEditing}
                required 
              />
              {errors.ip && <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors.ip}</p>}
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                {/* Colonne gauche : Signer Account */}
                <div>
                  <label style={{ color: '#334155' }} className="block text-sm font-medium mb-2">Signer Account (Validator)</label>
                  <input
                    type="text"
                    value={signerAccount}
                    onChange={e => {
                      setSignerAccount(e.target.value);
                      validateField('signerAccount', e.target.value);
                    }}
                    style={{ 
                      background: '#fff', 
                      border: '1px solid #d1d5db', 
                      borderRadius: 12, 
                      padding: 12,
                      width: '100%'
                    }}
                    className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors.signerAccount ? 'border-red-500' : ''}`}
                    placeholder="0x... Ethereum address"
                    required
                    disabled={isEditing}
                  />
                  {errors.signerAccount && <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors.signerAccount}</p>}
                </div>
                
                {/* Colonne droite : Toggle Auto Signer */}
                <div className="flex flex-col items-center">
                  <label style={{ color: '#334155' }} className="block text-sm font-medium mb-2 text-center">Miner Nodes Automatically Signer</label>
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAutoSigner(!autoSigner)}
                      style={{
                        position: 'relative',
                        width: 56,
                        height: 28,
                        background: autoSigner ? 'linear-gradient(135deg, #10b981, #059669)' : '#d1d5db',
                        borderRadius: 14,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: autoSigner ? '0 4px 12px rgba(16, 185, 129, 0.4)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transform: 'scale(1)',
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      disabled={isEditing}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: 2,
                          left: autoSigner ? 30 : 2,
                          width: 24,
                          height: 24,
                          background: '#fff',
                          borderRadius: 12,
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {autoSigner ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M10 3L4.5 8.5L2 6" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M9 3L3 9M3 3l6 6" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                    </button>
                    <span style={{ 
                      fontSize: 10, 
                      fontWeight: 600, 
                      color: autoSigner ? '#10b981' : '#6b7280',
                      transition: 'color 0.3s ease'
                    }}>
                      {autoSigner ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Prefunded addresses section */}
      {!isEditing && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: 16,
            boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
            padding: 24,
            marginBottom: 24,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Coins style={{ color: '#16a34a' }} className="h-6 w-6" />
              <h2 style={{ color: '#1e293b' }} className="text-xl font-semibold">Prefunded Addresses</h2>
            </div>
            <button
              type="button"
              onClick={() => setPrefundedAccounts(prev => [...prev, { address: '', amount: '' }])}
              style={{ background: '#16a34a', color: '#fff', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4, border: 'none' }}
            >
              <Plus style={{ color: '#fff' }} className="h-4 w-4" />
              Add
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {prefundedAccounts.map((acc, i) => (
              <div key={i} style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }} className="flex flex-wrap items-center gap-4">
                <div style={{ flex: '1 1 340px', minWidth: 0, maxWidth: '100%' }}>
                  <input
                    value={acc.address}
                    onChange={e => {
                      const copy = [...prefundedAccounts];
                      copy[i] = { ...copy[i], address: e.target.value };
                      setPrefundedAccounts(copy);
                      validatePrefundedAccount(i, 'address', e.target.value);
                    }}
                    style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12, minWidth: 0, width: '100%', maxWidth: '100%' }}
                    className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors[`prefunded_${i}_address`] ? 'border-red-500' : ''}`}
                    placeholder="0x... Ethereum address"
                    disabled={isEditing}
                    required
                  />
                  {errors[`prefunded_${i}_address`] && (
                    <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors[`prefunded_${i}_address`]}</p>
                  )}
                </div>
                <div style={{ flex: '0 0 160px', minWidth: 140, maxWidth: 180 }} className="w-full sm:w-40">
                  <input
                    value={acc.amount}
                    onChange={e => {
                      const copy = [...prefundedAccounts];
                      copy[i] = { ...copy[i], amount: e.target.value };
                      setPrefundedAccounts(copy);
                      validatePrefundedAccount(i, 'amount', e.target.value);
                    }}
                    type="number"
                    step="any"
                    min="0"
                    style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12, width: '100%' }}
                    className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors[`prefunded_${i}_amount`] ? 'border-red-500' : ''}`}
                    placeholder="Amount"
                    disabled={isEditing}
                    required
                  />
                  {errors[`prefunded_${i}_amount`] && (
                    <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors[`prefunded_${i}_amount`]}</p>
                  )}
                </div>
                {prefundedAccounts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setPrefundedAccounts(prev => prev.filter((_, j) => j !== i))}
                    style={{ color: '#dc2626', background: '#fee2e2', borderRadius: 12, padding: 12, border: 'none' }}
                    title="Remove this address"
                  >
                    <Trash2 style={{ color: '#dc2626' }} className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Nodes section */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 16,
          boxShadow: '0 4px 24px 0 rgba(0,0,0,0.08)',
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <NetworkIcon style={{ color: '#7c3aed' }} className="h-6 w-6" />
            <h2 style={{ color: '#1e293b' }} className="text-xl font-semibold">Nodes</h2>
          </div>
          <button
            type="button"
            onClick={handleAddNode}
            style={{ background: '#7c3aed', color: '#fff', borderRadius: 12, padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 4, border: 'none' }}
          >
            <Plus style={{ color: '#fff' }} className="h-4 w-4" />
            Add
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {nodes.map((node, i) => (
            <div key={i} style={{ background: '#f3f0ff', borderRadius: 12, padding: 16 }} className="flex items-center gap-4">
              <select 
                value={node.type} 
                onChange={e => handleNodeChange(i, 'type', e.target.value)}
                style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, padding: 8, minWidth: 90 }}
                className="border"
              >
                <option value="rpc">rpc</option>
                <option value="miner">signer</option>
                <option value="node">normal</option>
              </select>
              <div className="flex-1">
                <input 
                  value={node.ip} 
                  onChange={e => {
                    validateNodeIP(i, e.target.value);
                    handleNodeChange(i, 'ip', e.target.value);
                  }}
                  style={{ background: '#fff', border: '1px solid #d1d5db', borderRadius: 12, padding: 12 }}
                  className={`w-full focus:ring-2 focus:ring-blue-500 focus:border-transparent ${errors[`node_${i}`] ? 'border-red-500' : ''}`}
                  placeholder="Node IP" 
                  required
                />
                {errors[`node_${i}`] && (
                  <p style={{ color: '#dc2626' }} className="text-xs mt-1">{errors[`node_${i}`]}</p>
                )}
              </div>
              {nodes.length > 1 && (
                <button
                  type="button"
                  onClick={() => setNodes(prev => prev.filter((_, j) => j !== i))}
                  style={{ color: '#dc2626', background: '#fee2e2', borderRadius: 12, padding: 12, border: 'none' }}
                  title="Remove this node"
                >
                  <Trash2 style={{ color: '#dc2626' }} className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Loading spinner for creation */}
      {isLoading && (
        <motion.div
          initial={{ width: 0, opacity: 0.7 }}
          animate={{ width: ['0%', '100%', '0%'], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          style={{ height: 8, background: 'linear-gradient(90deg,#2563eb,#6366f1)', borderRadius: 6, marginBottom: 18 }}
        />
      )}
      <div className="flex mt-4">
        <button 
          type="submit" 
          disabled={Object.keys(errors).length > 0}
          style={{ background: 'linear-gradient(90deg,#2563eb,#6366f1)', color: '#fff', borderRadius: 12, padding: '16px 0', width: '100%', fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', border: 'none', transition: 'all 0.3s' }}
        >
          Save
        </button>
        <button type="button" onClick={onCancel} style={{ background: '#fff', color: '#334155', border: '1px solid #d1d5db', borderRadius: 12, padding: '16px 0', width: '100%', fontWeight: 600, fontSize: 16, boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)', borderLeft: 'none', transition: 'all 0.3s' }}>Cancel</button>
      </div>
    </form>
  );
}