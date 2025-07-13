"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "../../../components/ui/button";
import LiveNetworkStatus from "../../../components/LiveNetworkStatus";
import { Network } from "../../../types/network";
import { 
  ArrowLeft, 
  Network as NetworkIcon, 
  Settings, 
  Coins, 
  Server, 
  Globe, 
  Shield,
  Copy,
  CheckCircle
} from "lucide-react";

export default function NetworkDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [network, setNetwork] = useState<Network | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && params.id) {
      const data = localStorage.getItem("networks");
      if (data) {
        const networks: Network[] = JSON.parse(data);
        const foundNetwork = networks.find(n => n.id === params.id);
        setNetwork(foundNetwork || null);
      }
    }
  }, [params.id]);

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!network) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Network Not Found</h1>
            <p className="text-gray-600 mb-6">The requested network could not be found.</p>
            <Button onClick={() => router.push('/networks')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Networks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const CopyableField = ({ label, value, fieldName }: { label: string; value: string; fieldName: string }) => (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <button
          onClick={() => copyToClipboard(value, fieldName)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        >
          {copiedField === fieldName ? (
            <>
              <CheckCircle className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <div className="font-mono text-sm text-gray-800 bg-white rounded border p-2 break-all">
        {value}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-6 mb-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <NetworkIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{network.network}</h1>
                <p className="text-gray-600">Network Details & Configuration</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => router.push('/networks')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Networks
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-6 w-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-800">Basic Configuration</h2>
            </div>
            <div className="space-y-4">
              <CopyableField label="Network Name" value={network.network} fieldName="networkName" />
              <CopyableField label="Chain ID" value={network.chainId.toString()} fieldName="chainId" />
              <CopyableField label="Main IP Address" value={network.ip} fieldName="mainIp" />
              {network.cidr && (
                <CopyableField label="Subnet (CIDR)" value={network.cidr} fieldName="cidr" />
              )}
              <div className="bg-gray-50 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Auto-Signer</label>
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${network.autoSigner ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`font-medium ${network.autoSigner ? 'text-green-700' : 'text-red-700'}`}>
                    {network.autoSigner ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Nodes */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Server className="h-6 w-6 text-purple-600" />
              <h2 className="text-xl font-semibold text-gray-800">Network Nodes</h2>
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
                {network.nodes.length}
              </span>
            </div>
            <div className="space-y-3 max-h-[530px] overflow-y-auto">
              {network.nodes.map((node, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        node.type === 'rpc' ? 'bg-blue-100 text-blue-800' :
                        node.type === 'miner' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {node.type.toUpperCase()}
                      </span>
                      <span className="font-medium text-gray-800">{node.name}</span>
                    </div>
                    {node.type != 'node' ? 
                        <span className="text-sm font-mono text-gray-600">Port {node.port}</span> :
                        ""
                    }
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-800 bg-white rounded border p-2 flex-1 mr-2">
                      {node.ip}
                    </span>
                    <button
                      onClick={() => copyToClipboard(node.ip, `node_${index}`)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {copiedField === `node_${index}` ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Signer Account */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-800">First Validator</h2>
            </div>
            <div className="space-y-4">
              <CopyableField label="Signer Account" value={network.signerAccount} fieldName="signerAccount" />
            </div>
          </motion.div>

          {/* Prefunded Accounts */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-lg shadow-lg p-6"
          >
            <div className="flex items-center gap-3 mb-6">
              <Coins className="h-6 w-6 text-yellow-600" />
              <h2 className="text-xl font-semibold text-gray-800">Prefunded Accounts</h2>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
                {network.prefundedAccounts.length}
              </span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {network.prefundedAccounts.map((account, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Account #{index + 1}</span>
                    <span className="text-sm font-bold text-green-600">{account.amount} ETH</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-gray-800 bg-white rounded border p-1 break-all flex-1 mr-2">
                      {account.address}
                    </span>
                    <button
                      onClick={() => copyToClipboard(account.address, `prefunded_${index}`)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      {copiedField === `prefunded_${index}` ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Connection Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white rounded-lg shadow-lg p-6 mt-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-6 w-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-800">Connection Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {network.nodes.filter(node => node.type === 'rpc').map((rpcNode, index) => (
              <div key={index} className="bg-indigo-50 rounded-lg p-4">
                <h3 className="font-medium text-indigo-800 mb-2">RPC Endpoint #{index + 1}</h3>
                <CopyableField 
                  label="HTTP RPC URL" 
                  value={`http://localhost:${rpcNode.port}`} 
                  fieldName={`rpc_http_${index}`} 
                />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Live Network Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white rounded-lg shadow-lg p-6 mt-6"
        >
          <LiveNetworkStatus
            rpcEndpoints={network.nodes.filter(node => node.type === 'rpc').map(node => ({
              ip: node.ip,
              port: node.port
            }))}
            prefundedAccounts={network.prefundedAccounts}
            networkId={network.id}
          />
        </motion.div>
      </div>
    </div>
  );
}
