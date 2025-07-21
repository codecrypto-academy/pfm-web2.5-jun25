"use client";
import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JsonRpcProvider, formatEther } from 'ethers';
import { 
  Activity, 
  Users, 
  Coins, 
  Clock,
  TrendingUp,
  Hash,
  Code2,
  Zap,
  Send
} from 'lucide-react';

interface TransactionDetail {
  hash: string;
  to: string | null;
  from: string;
  data: string;
  value: bigint;
  gasUsed?: bigint;
}

interface Block {
  number: number;
  timestamp: number;
  hash: string;
  transactions: readonly string[];
  transactionDetails?: TransactionDetail[];
  gasUsed: bigint;
}

interface Props {
  rpcEndpoints: { ip: string; port: number }[];
  prefundedAccounts: { address: string; amount: string }[];
  networkId: string;
}

export default function LiveNetworkStatus({ rpcEndpoints, prefundedAccounts, networkId }: Props) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [validators, setValidators] = useState<string[]>([]);
  const [balances, setBalances] = useState<{[address: string]: string}>({});
  const [isConnected, setIsConnected] = useState(false);
  const [newBlockAnimation, setNewBlockAnimation] = useState(false);
  const [connectionType, setConnectionType] = useState<'polling' | 'disconnected'>('disconnected');
  const [debugInfo, setDebugInfo] = useState<string>('Initializing...');
  const [latestBlockNumber, setLatestBlockNumber] = useState<number>(0);
  
  // Ref pour maintenir le dernier numéro de bloc pour le polling
  const lastKnownBlockRef = useRef<number>(0);

  // Fonction pour analyser le type de transaction
  const analyzeTransactionType = (tx: TransactionDetail): 'deploy' | 'contract' | 'transfer' => {
    // Déploiement de contrat : to est null et il y a des données
    if (!tx.to && tx.data && tx.data !== '0x' && tx.data.length > 2) {
      return 'deploy';
    }
    
    // Interaction avec contrat : to existe et il y a des données significatives
    if (tx.to && tx.data && tx.data !== '0x' && tx.data.length > 10) {
      return 'contract';
    }
    
    // Transfert simple
    return 'transfer';
  };

  // Fonction pour récupérer les détails des transactions d'un bloc
  const fetchTransactionDetails = async (provider: JsonRpcProvider, transactionHashes: readonly string[]): Promise<TransactionDetail[]> => {
    const details: TransactionDetail[] = [];
    
    for (const hash of transactionHashes) {
      try {
        const tx = await provider.getTransaction(hash);
        const receipt = await provider.getTransactionReceipt(hash);
        
        if (tx) {
          details.push({
            hash: tx.hash,
            to: tx.to,
            from: tx.from,
            data: tx.data,
            value: tx.value,
            gasUsed: receipt?.gasUsed || BigInt(0)
          });
        }
      } catch (error) {
        console.error(`Error fetching transaction ${hash}:`, error);
      }
    }
    
    return details;
  };

  // Fonction pour obtenir les animations radar scan
  const getBlockAnimations = (isNewBlock: boolean, hasTransactions: boolean) => {
    const baseColor = hasTransactions ? "#10b981" : "#6b7280";
    const accentColor = hasTransactions ? "#059669" : "#4b5563";

    // Animation pour nouveaux blocs
    if (isNewBlock) {
      return {
        scale: [1, 1.02, 1],
        opacity: [1, 0.8, 1],
        borderWidth: ["4px", "6px", "4px"],
        borderColor: [baseColor, accentColor, baseColor]
      };
    }

    // Style radar statique pour tous les autres blocs
    return {
      borderWidth: "4px",
      borderColor: baseColor
    };
  };

  // Fonction pour obtenir l'animation du conteneur radar scan
  const getContainerAnimation = (isNewBlock: boolean) => {
    if (!isNewBlock) return {};

    return {
      scale: [1, 1.005, 1],
      opacity: [1, 0.95, 1]
    };
  };

  // Fonction pour obtenir l'animation de l'overlay radar scan
  const getOverlayAnimation = (hasTransactions: boolean) => {
    return {
      scale: [0, 1.5, 2],
      opacity: [0.8, 0.4, 0],
      borderRadius: ['50%', '50%', '50%']
    };
  };

  // Fonction pour obtenir la durée d'animation radar scan
  const getAnimationDuration = () => {
    return 1.5;
  };

  // Fonction pour obtenir l'icône selon les types de transactions dans le bloc
  const getBlockIcons = (transactionDetails?: TransactionDetail[]) => {
    if (!transactionDetails || transactionDetails.length === 0) {
      return null;
    }

    const types = new Set(transactionDetails.map(tx => analyzeTransactionType(tx)));
    const icons = [];

    if (types.has('deploy')) {
      icons.push(
        <div key="deploy" className="relative group" title="Déploiement de contrat">
          <Code2 className="w-4 h-4 text-blue-600" />
        </div>
      );
    }
    
    if (types.has('contract')) {
      icons.push(
        <div key="contract" className="relative group" title="Interaction contrat">
          <Zap className="w-4 h-4 text-purple-600" />
        </div>
      );
    }
    
    if (types.has('transfer')) {
      icons.push(
        <div key="transfer" className="relative group" title="Transfert simple">
          <Send className="w-4 h-4 text-green-600" />
        </div>
      );
    }

    return icons;
  };

  // Test initial de connectivité simple
  useEffect(() => {
    const testConnection = async () => {
      if (!rpcEndpoints.length) {
        setDebugInfo('No RPC endpoints provided');
        return;
      }

      const endpoint = rpcEndpoints[0];
      setDebugInfo(`Testing connection to localhost:${endpoint.port}...`);

      try {
        // Test via notre API de test
        const response = await fetch(`/api/test-connection?port=${endpoint.port}`);
        const data = await response.json();
        
        if (data.success) {
          setDebugInfo(`✅ Connected! Block: ${data.blockNumber}, Chain: ${data.chainId}`);
          setIsConnected(true);
          setConnectionType('polling');
          
          // Récupérer quelques blocs initiaux
          const httpProvider = new JsonRpcProvider(`http://localhost:${endpoint.port}`);
          const latestBlocks = [];
          for (let i = Math.max(0, data.blockNumber - 4); i <= data.blockNumber; i++) {
            try {
              const block = await httpProvider.getBlock(i, true);
              if (block) {
                const blockWithDetails = block as Block;
                
                // Récupérer les détails des transactions s'il y en a
                if (block.transactions.length > 0) {
                  const transactionDetails = await fetchTransactionDetails(httpProvider, block.transactions);
                  blockWithDetails.transactionDetails = transactionDetails;
                }
                
                latestBlocks.unshift(blockWithDetails);
              }
            } catch (error) {
              console.error(`Error fetching block ${i}:`, error);
            }
          }
          setBlocks(latestBlocks);
          
          // Mettre à jour la référence du dernier bloc
          if (latestBlocks.length > 0) {
            lastKnownBlockRef.current = latestBlocks[0].number;
          }
          
          // Déclencher le polling automatique après le chargement initial
          setTimeout(() => {
            setIsConnected(true); // Force trigger for useEffect
          }, 500);
        } else {
          setDebugInfo(`❌ API Test failed: ${data.error}`);
          setIsConnected(false);
          setConnectionType('disconnected');
        }
        
      } catch (error) {
        setDebugInfo(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsConnected(false);
        setConnectionType('disconnected');
        console.error('Connection test failed:', error);
      }
    };

    testConnection();
  }, [rpcEndpoints]);

  const handleManualTest = async () => {
    if (!rpcEndpoints.length) return;
    
    const endpoint = rpcEndpoints[0];
    setDebugInfo('Manual test started...');
    
    try {
      const response = await fetch(`/api/test-connection?port=${endpoint.port}`);
      const data = await response.json();
      setDebugInfo(`Manual test result: ${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      setDebugInfo(`Manual test error: ${error}`);
    }
  };

  const testAnimation = () => {
    setDebugInfo('🎬 Testing animation...');
    
    // Créer des détails de transaction fictifs pour tester les icônes
    const mockTransactionDetails: TransactionDetail[] = [
      {
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        to: Math.random() > 0.6 ? null : `0x${Math.random().toString(16).substr(2, 40)}`, // 40% chance de déploiement
        from: `0x${Math.random().toString(16).substr(2, 40)}`,
        data: Math.random() > 0.3 ? `0x${Math.random().toString(16).substr(2, 100)}` : '0x', // 70% chance d'avoir des données
        value: BigInt(Math.floor(Math.random() * 1000000)),
        gasUsed: BigInt(Math.floor(Math.random() * 100000))
      }
    ];
    
    // Créer un bloc fictif pour tester l'animation
    const mockBlock: Block = {
      number: Math.max((blocks[0]?.number || 0) + 1, Date.now()), // Assurer l'unicité
      timestamp: Math.floor(Date.now() / 1000),
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      transactions: [`0x${Math.random().toString(16).substr(2, 64)}`],
      transactionDetails: mockTransactionDetails,
      gasUsed: BigInt(Math.floor(Math.random() * 1000000))
    };

    // Ajouter le nouveau bloc (en vérifiant les doublons)
    setBlocks(prev => {
      const blockExists = prev.some(b => b.number === mockBlock.number);
      if (!blockExists) {
        return [mockBlock, ...prev.slice(0, 9)];
      }
      return prev;
    });
    setLatestBlockNumber(mockBlock.number);
    lastKnownBlockRef.current = mockBlock.number; // Mettre à jour la ref aussi
    
    // Déclencher l'animation
    setNewBlockAnimation(true);
    setDebugInfo(`🎬 Animation triggered! New block #${mockBlock.number}`);
    
    setTimeout(() => {
      setNewBlockAnimation(false);
      setDebugInfo(`✅ Animation completed for block #${mockBlock.number}`);
    }, 2000);
  };

  const forceCheckNewBlocks = async () => {
    if (!rpcEndpoints.length) return;
    
    setDebugInfo('🔍 Forcing block check...');
    
    try {
      const httpProvider = new JsonRpcProvider(`http://localhost:${rpcEndpoints[0].port}`);
      const currentBlockNumber = await httpProvider.getBlockNumber();
      
      setDebugInfo(`🔍 Current block on network: ${currentBlockNumber}, Last known: ${blocks[0]?.number || 0}`);
      
      if (currentBlockNumber > (blocks[0]?.number || 0)) {
        setDebugInfo(`🎯 Found ${currentBlockNumber - (blocks[0]?.number || 0)} new blocks!`);
        
        // Récupérer les nouveaux blocs
        for (let i = (blocks[0]?.number || 0) + 1; i <= currentBlockNumber; i++) {
          const block = await httpProvider.getBlock(i, true);
          if (block) {
            console.log('🎬 Adding force-fetched block:', i);
            
            const blockWithDetails = block as Block;
            
            // Récupérer les détails des transactions s'il y en a
            if (block.transactions.length > 0) {
              const transactionDetails = await fetchTransactionDetails(httpProvider, block.transactions);
              blockWithDetails.transactionDetails = transactionDetails;
            }
            
            setBlocks(prev => {
              // Vérifier si le bloc existe déjà pour éviter les doublons
              const blockExists = prev.some(b => b.number === block.number);
              if (!blockExists) {
                return [blockWithDetails, ...prev.slice(0, 9)];
              }
              return prev;
            });
            setLatestBlockNumber(i);
            lastKnownBlockRef.current = i; // Mettre à jour la ref
            setNewBlockAnimation(true);
            setDebugInfo(`🎬 Animation triggered for force-fetched block #${i}`);
            
            setTimeout(() => {
              setNewBlockAnimation(false);
            }, 2000);
          }
        }
      } else {
        setDebugInfo(`✅ No new blocks found. Network: ${currentBlockNumber}, Local: ${blocks[0]?.number || 0}`);
      }
    } catch (error) {
      setDebugInfo(`❌ Force check failed: ${error}`);
    }
  };

  const restartPolling = async () => {
    setDebugInfo('🔄 Restarting polling manually...');
    
    // Réinitialiser l'état pour déclencher le useEffect
    setIsConnected(false);
    setConnectionType('disconnected');
    
    // Après un court délai, rétablir l'état de polling
    setTimeout(() => {
      setIsConnected(true);
      setConnectionType('polling');
      setDebugInfo(`🔄 Polling manually restarted from block ${lastKnownBlockRef.current}`);
    }, 200);
  };

  // HTTP Polling pour les blocs en temps réel
  useEffect(() => {
    if (!rpcEndpoints.length) return;

    console.log('� Using HTTP polling only for block monitoring');
    setDebugInfo('🔄 HTTP polling enabled for block monitoring');
    
    // Pas de cleanup nécessaire pour le moment
    return () => {
      console.log('🧹 HTTP polling effect cleanup');
    };
  }, [rpcEndpoints]);

  // Effect séparé pour démarrer le polling après que les blocs initiaux soient chargés
  useEffect(() => {
    if (blocks.length > 0 && connectionType === 'polling') {
      lastKnownBlockRef.current = blocks[0].number;
      console.log(`📝 Updated lastKnownBlockRef to: ${blocks[0].number}`);
    }
  }, [blocks, connectionType]);

  // Effect dédié pour gérer le polling automatique
  useEffect(() => {
    if (!isConnected || connectionType !== 'polling' || !rpcEndpoints.length) {
      return;
    }

    console.log('🚀 Starting automatic polling...');
    setDebugInfo(`🚀 Auto-starting polling from block ${lastKnownBlockRef.current}`);

    let pollInterval: NodeJS.Timeout | null = null;
    let isDestroyed = false;
    
    const httpProvider = new JsonRpcProvider(`http://localhost:${rpcEndpoints[0].port}`);

    pollInterval = setInterval(async () => {
      if (isDestroyed) return;

      try {
        const currentBlockNumber = await httpProvider.getBlockNumber();
        console.log(`🔄 Auto-polling check: current=${currentBlockNumber}, lastKnown=${lastKnownBlockRef.current}`);
        
        if (currentBlockNumber > lastKnownBlockRef.current) {
          console.log('🔥 NEW BLOCKS DETECTED via Auto-Polling:', lastKnownBlockRef.current + 1, 'to', currentBlockNumber);
          setDebugInfo(`🔥 Auto-Polling: New blocks detected! ${lastKnownBlockRef.current + 1} to ${currentBlockNumber}`);
          
          // Récupérer tous les nouveaux blocs
          const newBlocks: Block[] = [];
          for (let i = lastKnownBlockRef.current + 1; i <= currentBlockNumber; i++) {
            if (isDestroyed) return;
            
            const block = await httpProvider.getBlock(i, true);
            if (block) {
              const blockWithDetails = block as Block;
              
              // Récupérer les détails des transactions s'il y en a
              if (block.transactions.length > 0) {
                const transactionDetails = await fetchTransactionDetails(httpProvider, block.transactions);
                blockWithDetails.transactionDetails = transactionDetails;
              }
              
              newBlocks.push(blockWithDetails);
            }
          }
          
          // Ajouter tous les nouveaux blocs d'un coup (en évitant les doublons)
          if (newBlocks.length > 0 && !isDestroyed) {
            setBlocks(prev => {
              // Filtrer les blocs existants pour éviter les doublons
              const existingBlockNumbers = new Set(prev.map(b => b.number));
              const uniqueNewBlocks = newBlocks.filter(b => !existingBlockNumbers.has(b.number));
              
              if (uniqueNewBlocks.length > 0) {
                return [...uniqueNewBlocks.reverse(), ...prev.slice(0, 10 - uniqueNewBlocks.length)];
              }
              return prev;
            });
            
            // Déclencher l'animation pour le dernier bloc
            const latestBlock = newBlocks[newBlocks.length - 1];
            setLatestBlockNumber(latestBlock.number);
            lastKnownBlockRef.current = latestBlock.number;
            
            console.log('🎬 Adding blocks via auto-polling and triggering animation:', newBlocks.map(b => b.number));
            setNewBlockAnimation(true);
            setDebugInfo(`🎬 Animation triggered for ${newBlocks.length} new blocks, latest: #${latestBlock.number}`);
            
            setTimeout(() => {
              if (!isDestroyed) {
                setNewBlockAnimation(false);
                console.log('⏸️ Animation stopped');
              }
            }, 2000);
          }
        } else {
          console.log(`✅ No new blocks. Current: ${currentBlockNumber}, Known: ${lastKnownBlockRef.current}`);
        }
      } catch (error) {
        console.error('Auto-polling error:', error);
        setDebugInfo(`❌ Auto-polling error: ${error}`);
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      isDestroyed = true;
      if (pollInterval) {
        clearInterval(pollInterval);
        console.log('🛑 Auto-polling stopped');
      }
    };
  }, [isConnected, connectionType, rpcEndpoints]); // Redémarre quand l'état change

  // Fetch validators
  useEffect(() => {
    const fetchValidators = async () => {
      if (!rpcEndpoints.length) return;
      
      try {
        const rpcEndpoint = rpcEndpoints.find(ep => ep) || rpcEndpoints[0];
        const response = await fetch(
          `/api/network/${networkId}/validators?ip=localhost&port=${rpcEndpoint.port}`
        );
        const data = await response.json();
        if (data.success) {
          setValidators(data.signers || []);
        } else {
          console.error('API error:', data.error);
        }
      } catch (error) {
        console.error('Error fetching validators:', error);
      }
    };

    fetchValidators();
    const interval = setInterval(fetchValidators, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [networkId, rpcEndpoints]);

  // Fetch balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!rpcEndpoints.length || !prefundedAccounts.length) return;
      
      try {
        const rpcEndpoint = rpcEndpoints.find(ep => ep) || rpcEndpoints[0];
        const accountsParam = encodeURIComponent(JSON.stringify(prefundedAccounts));
        const response = await fetch(
          `/api/network/${networkId}/balances?ip=localhost&port=${rpcEndpoint.port}&accounts=${accountsParam}`
        );
        const data = await response.json();
        if (data.success) {
          const balanceMap = data.balances.reduce((acc: any, item: any) => {
            acc[item.address] = item.balanceEth;
            return acc;
          }, {});
          setBalances(balanceMap);
        } else {
          console.error('API error:', data.error);
        }
      } catch (error) {
        console.error('Error fetching balances:', error);
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [networkId, rpcEndpoints, prefundedAccounts]);

  return (
    <div className="space-y-6">
      {/* Debug Info *}
      <div className="bg-gray-100 rounded-lg p-4 text-sm">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div><strong>Debug Info:</strong> {debugInfo}</div>
            <div><strong>RPC Endpoints:</strong> {rpcEndpoints.length > 0 ? `localhost:${rpcEndpoints[0].port}` : 'None'}</div>
            <div><strong>Network ID:</strong> {networkId}</div>
            <div><strong>Blocks:</strong> {blocks.length}</div>
            <div><strong>Latest Block:</strong> {blocks[0]?.number || 'None'}</div>
            <div><strong>Last Known Ref:</strong> {lastKnownBlockRef.current}</div>
            <div><strong>Validators:</strong> {validators.length}</div>
            <div><strong>Balances:</strong> {Object.keys(balances).length}</div>
            <div><strong>Animation State:</strong> {newBlockAnimation ? '🎬 ACTIVE' : '⏸️ INACTIVE'}</div>
            <div><strong>Connection Type:</strong> {connectionType}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={handleManualTest}
              className="bg-blue-500 text-white px-3 py-1 rounded text-xs hover:bg-blue-600"
            >
              Test Connection
            </button>
            <button 
              onClick={testAnimation}
              className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
            >
              Test Animation
            </button>
            <button 
              onClick={forceCheckNewBlocks}
              className="bg-purple-500 text-white px-3 py-1 rounded text-xs hover:bg-purple-600"
            >
              Check New Blocks
            </button>
            <button 
              onClick={restartPolling}
              className="bg-orange-500 text-white px-3 py-1 rounded text-xs hover:bg-orange-600"
            >
              Restart Polling
            </button>
          </div>
        </div>
      </div>*/}

      {/* Network Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-green-600" />
          <h2 className="text-xl font-semibold text-gray-800">Live Network Status</h2>
          {newBlockAnimation && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: 360 }}
              exit={{ scale: 0 }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
              className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
            >
              <span className="text-white text-xs font-bold">!</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
              {isConnected ? 'HTTP Polling' : 'Disconnected'}
            </span>
          </div>
          {/*newBlockAnimation && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium"
            >
              🎬 Animation is loading...
            </motion.div>
          )*/}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Validators */}
        <motion.div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-800">Active Validators</h3>
            <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full">
              {validators.length}
            </span>
          </div>
          <div className="space-y-3">
            {validators.map((validator, index) => (
              <motion.div
                key={validator}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-purple-50 rounded-lg p-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Validator #{index + 1}</span>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="font-mono text-xs text-gray-600 break-all mt-1">
                  {validator}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Account Balances */}
        <motion.div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="h-5 w-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">Live Balances</h3>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {prefundedAccounts.map((account, index) => (
              <motion.div
                key={account.address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-yellow-50 rounded-lg p-3"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Account #{index + 1}</span>
                  <motion.span 
                    key={balances[account.address]} // Re-animate on balance change
                    initial={{ scale: 1.2, color: '#10b981' }}
                    animate={{ scale: 1, color: '#059669' }}
                    className="text-sm font-bold"
                  >
                    {balances[account.address] ? `${parseFloat(balances[account.address]).toFixed(4)} ETH` : 'Loading...'}
                  </motion.span>
                </div>
                <div className="font-mono text-xs text-gray-600 break-all">
                  {account.address}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Latest Blocks - Full Width */}
      <motion.div 
        className="bg-white rounded-lg shadow-lg p-6"
        animate={getContainerAnimation(newBlockAnimation)}
        transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
      >          <div className="flex items-center gap-3 mb-4">
          <Hash className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-800">Latest Blocks</h3>
          
          {/* Légende */}
          <div className="flex items-center gap-4 ml-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs text-gray-600">With Transactions</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
              <span className="text-xs text-gray-600">Empty Block</span>
            </div>
            <div className="flex items-center gap-2">
              <Code2 className="w-3 h-3 text-blue-600" />
              <span className="text-xs text-gray-600">Contract Deploy</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3 h-3 text-purple-600" />
              <span className="text-xs text-gray-600">Contract Call</span>
            </div>
            <div className="flex items-center gap-2">
              <Send className="w-3 h-3 text-green-600" />
              <span className="text-xs text-gray-600">Transfer</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {blocks.map((block, index) => (
              <motion.div
                key={block.number}
                layout
                initial={{ opacity: 0, y: -30, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  ...getBlockAnimations(index === 0 && newBlockAnimation, block.transactions.length > 0)
                }}
                exit={{ opacity: 0, y: 30, scale: 0.8 }}
                transition={{ 
                  duration: getAnimationDuration(), 
                  delay: index * 0.1,
                  ease: "easeInOut"
                }}
                className={`bg-gradient-to-r p-4 rounded-lg border-l-4 relative overflow-hidden ${
                  block.transactions.length > 0 
                    ? 'from-green-50 to-blue-50 border-green-500' 
                    : 'from-gray-50 to-gray-100 border-gray-400'
                } ${
                  // Style radar pour tous les blocs
                  block.transactions.length > 0 
                    ? 'border-4 border-green-500' 
                    : 'border-4 border-gray-400'
                }`}
              >
                {/* Animation de "nouveau bloc" pour le premier bloc */}
                {index === 0 && newBlockAnimation && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={getOverlayAnimation(block.transactions.length > 0)}
                    transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
                    className={`absolute top-0 left-0 w-full h-full border-4 ${
                      block.transactions.length > 0 ? 'border-green-400' : 'border-gray-400'
                    }`}
                  />
                )}
                
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <motion.span 
                    className={`font-bold text-lg ${block.transactions.length > 0 ? 'text-green-700' : 'text-gray-600'}`}
                    animate={index === 0 && newBlockAnimation ? { 
                      scale: [1, 1.1],
                      color: block.transactions.length > 0 ? ["#15803d", "#059669"] : ["#4b5563", "#4b5563"]
                    } : {}}
                    transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
                  >
                    #{block.number}
                  </motion.span>
                  {block.transactions.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium text-orange-600">TX</span>
                      {/* Icônes de type de transaction */}
                      <div className="flex items-center gap-1 ml-1">
                        {getBlockIcons(block.transactionDetails)}
                      </div>
                    </div>
                  )}
                  {index === 0 && newBlockAnimation && (
                    <motion.div
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ 
                        scale: [0, 1.2], 
                        rotate: [0, 360],
                        backgroundColor: block.transactions.length > 0 ? ["#f97316", "#ea580c"] : ["#6b7280", "#6b7280"]
                      }}
                      transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
                      className={`w-5 h-5 rounded-full ${block.transactions.length > 0 ? 'bg-orange-500' : 'bg-gray-500'}`}
                    />
                  )}
                </div>
                <div className="text-xs text-gray-600 space-y-1 relative z-10">
                  <motion.div 
                    className="truncate"
                    animate={index === 0 && newBlockAnimation ? { 
                      opacity: [0.7, 0.4, 1] 
                    } : {}}
                    transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
                  >
                    Hash: {block.hash.slice(0, 8)}...{block.hash.slice(-6)}
                  </motion.div>
                  <div>TXs: {block.transactions.length}</div>
                  {block.transactions.length > 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-medium">Active</span>
                    </div>
                  )}
                  {block.transactions.length === 0 && (
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      <span className="text-gray-500">Empty</span>
                    </div>
                  )}
                  <div>Gas: {
                    Number(block.gasUsed) > 1000000 
                      ? `${(Number(block.gasUsed) / 1000000).toFixed(2)}M`
                      : Number(block.gasUsed) > 1000
                        ? `${(Number(block.gasUsed) / 1000).toFixed(1)}K`
                        : Number(block.gasUsed).toString()
                  }</div>
                  <div className="text-xs text-gray-500">
                    {new Date(block.timestamp * 1000).toLocaleTimeString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Network Stats */}
      <motion.div 
        className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: 1, 
          y: 0,
          ...(newBlockAnimation ? getContainerAnimation(true) : {})
        }}
        transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <motion.div 
              className="text-2xl font-bold"
              animate={newBlockAnimation ? { 
                scale: [1, 1.2],
                color: ["#ffffff", "#10f981"]
              } : {}}
              transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
              key={blocks[0]?.number} // Re-animate when block number changes
            >
              {blocks[0]?.number || 0}
            </motion.div>
            <div className="text-sm opacity-80">Latest Block</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{validators.length}</div>
            <div className="text-sm opacity-80">Validators</div>
          </div>
          <div className="text-center">
            <motion.div 
              className="text-2xl font-bold"
              animate={newBlockAnimation ? { 
                scale: [1, 1.1],
                color: ["#ffffff", "#10f981"]
              } : {}}
              transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
              key={`${blocks[0]?.number}-${blocks[0]?.transactions.length}`}
            >
              {blocks.length > 0 ? (blocks[0].transactions.length || 0) : 0}
            </motion.div>
            <div className="text-sm opacity-80">Last Block TXs</div>
          </div>
          <div className="text-center">
            <motion.div 
              className="text-2xl font-bold"
              animate={isConnected ? {
                scale: newBlockAnimation ? [1, 1.1] : 1,
                color: isConnected ? (newBlockAnimation ? ["#ffffff", "#10f981"] : "#ffffff") : "#ff6b6b"
              } : {}}
              transition={{ duration: getAnimationDuration(), ease: "easeInOut" }}
            >
              {isConnected ? 'LIVE' : 'OFF'}
            </motion.div>
            <div className="text-sm opacity-80">Status</div>
          </div>
        </div>
      </motion.div>

      {/* Debug Info *}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
        {debugInfo}
      </div>*/}
    </div>
  );
}
