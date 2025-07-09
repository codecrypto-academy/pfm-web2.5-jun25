'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNetwork } from '../context/NetworkContext';

interface Block {
  number: number;
  timestamp: number;
  transactionCount: number;
  gasUsed: string;
  miner: string;
  hash: string;
  gasLimit: string;
}

interface MiningBlock {
  number: number;
  progress: number;
  elapsedTime: number;
}

export default function BlockExplorer() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [miningBlock, setMiningBlock] = useState<MiningBlock | null>(null);
  const { selectedNetwork } = useNetwork();
  
  const BLOCK_TIME_SECONDS = 15; // De config.yaml
  const MAX_BLOCKS_DISPLAY = 13;

  const fetchBlocks = useCallback(async () => {
    if (!selectedNetwork) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/blocks?networkId=${selectedNetwork.id}&limit=${MAX_BLOCKS_DISPLAY}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blocks');
      }
      const data = await response.json();
      
      // Actualizar bloques con animación ciempiés
      setBlocks(prevBlocks => {
        const newBlocks = data.blocks;
        if (newBlocks.length > 0 && prevBlocks.length > 0) {
          // Detectar nuevo bloque
          const latestBlock = newBlocks[0];
          const wasNewBlock = latestBlock.number > prevBlocks[0]?.number;
          
          if (wasNewBlock) {
            // Reiniciar el bloque en minado
            setMiningBlock({
              number: latestBlock.number + 1,
              progress: 0,
              elapsedTime: 0
            });
          }
        }
        
        return newBlocks;
      });
      
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [selectedNetwork]);

  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 3000); // Refresh every 3 seconds
    return () => clearInterval(interval);
  }, [fetchBlocks]);

  // Timer para el bloque en minado
  useEffect(() => {
    if (!miningBlock) return;
    
    const timer = setInterval(() => {
      setMiningBlock(prev => {
        if (!prev) return null;
        
        const newElapsedTime = prev.elapsedTime + 1;
        const newProgress = Math.min((newElapsedTime / BLOCK_TIME_SECONDS) * 100, 100);
        
        return {
          ...prev,
          elapsedTime: newElapsedTime,
          progress: newProgress
        };
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [miningBlock]);

  // Inicializar bloque en minado si no existe
  useEffect(() => {
    if (blocks.length > 0 && !miningBlock) {
      setMiningBlock({
        number: blocks[0].number + 1,
        progress: 0,
        elapsedTime: 0
      });
    }
  }, [blocks, miningBlock]);

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Componente para el indicador de progreso circular
  const CircularProgress = ({ progress }: { progress: number }) => {
    const radius = 12;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;
    
    return (
      <div className="relative w-8 h-8">
        <svg className="transform -rotate-90 w-8 h-8" viewBox="0 0 32 32">
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="16"
            cy="16"
            r={radius}
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-medium text-white">{Math.round(progress)}%</span>
        </div>
      </div>
    );
  };

  // Componente para el bloque en minado
  const MiningBlockStrip = ({ block }: { block: MiningBlock }) => {
    const pulseAnimation = useMemo(() => {
      return {
        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      };
    }, []);
    
    return (
      <div 
        className="relative h-10 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 rounded-lg flex items-center justify-between px-3 shadow-lg transform transition-all duration-300 hover:scale-105"
        style={pulseAnimation}
      >
        <CircularProgress progress={block.progress} />
        <div className="flex-1 text-center">
          <div className="text-white font-bold text-sm">Block #{block.number}</div>
          <div className="text-blue-100 text-xs">Mining...</div>
        </div>
        <div className="text-white font-mono text-sm min-w-[50px] text-center">
          {block.elapsedTime}s
        </div>
      </div>
    );
  };

  // Componente para bloque confirmado
  const ConfirmedBlockStrip = ({ block, index }: { block: Block; index: number }) => {
    // SVG Components inline
    const GreenBlockIcon = () => (
      <svg width="24" height="24" viewBox="0 0 100 100" className="flex-shrink-0">
        <polygon points="50,10 90,30 50,50 10,30" fill="#3cb043"/>
        <polygon points="10,30 50,50 50,90 10,70" fill="#2d8c33"/>
        <polygon points="90,30 50,50 50,90 90,70" fill="#1f6623"/>
      </svg>
    );
    
    const BlueBlockIcon = () => (
      <svg width="24" height="24" viewBox="0 0 100 100" className="flex-shrink-0">
        <polygon points="50,10 90,30 50,50 10,30" fill="#4ea3e0"/>
        <polygon points="10,30 50,50 50,90 10,70" fill="#327bbd"/>
        <polygon points="90,30 50,50 50,90 90,70" fill="#1c4e96"/>
      </svg>
    );
    
    const formatHash = (hash: string) => {
      return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
    };
    
    return (
      <div 
        className="h-8 bg-white rounded-lg flex items-center px-3 shadow-sm border border-gray-200 transform transition-all duration-300 hover:scale-102"
        style={{
          animationDelay: `${index * 50}ms`,
          transform: `translateY(${index * 1}px)`,
        }}
      >
        {/* SVG Icon */}
        <div className="mr-3">
          {block.transactionCount > 0 ? <GreenBlockIcon /> : <BlueBlockIcon />}
        </div>
        
        {/* Block Info */}
        <div className="flex-1 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-gray-800">#{block.number}</span>
            <span className="text-gray-500 font-mono">{formatHash(block.hash)}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-gray-600">{block.transactionCount}tx</span>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedNetwork) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Blockchain Visualizer</h2>
          <p className="text-gray-500">Please select a network to see the block stream.</p>
        </div>
      </div>
    );
  }
  
  if (loading && blocks.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Blockchain Visualizer</h2>
          <div className="text-gray-500">Loading blockchain data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Blockchain Visualizer</h2>
          <div className="text-red-500">Error: {error}</div>
          <button 
            onClick={fetchBlocks}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">⛓️ Block Stream</h2>
          <div className="text-xs text-gray-500">
            {blocks.length > 0 ? `Latest: #${blocks[0].number}` : 'No blocks'}
          </div>
        </div>
      </div>

      {/* Visualización Central de Bloques */}
      <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-hidden">
        <div className="max-w-md mx-auto h-full">
          <div className="space-y-2 h-full overflow-y-auto max-h-[calc(100vh-200px)]">
            {/* Bloque en Minado */}
            {miningBlock && (
              <div className="mb-4">
                <MiningBlockStrip block={miningBlock} />
              </div>
            )}
            
            {/* Separador */}
            <div className="text-center py-2">
              <div className="text-xs text-gray-500 bg-gray-50">Confirmed Blocks</div>
            </div>
            
            {/* Bloques Confirmados */}
            <div className="space-y-1">
              {blocks.slice(0, MAX_BLOCKS_DISPLAY).map((block, index) => (
                <div 
                  key={block.hash}
                  className="transform transition-all duration-300 ease-in-out"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'slideDown 0.5s ease-out forwards'
                  }}
                >
                  <ConfirmedBlockStrip block={block} index={index} />
                </div>
              ))}
            </div>
            
            {/* Indicador de más bloques */}
            {blocks.length >= MAX_BLOCKS_DISPLAY && (
              <div className="text-center py-2">
                <div className="text-xs text-gray-500">
                  • • • {blocks.length - MAX_BLOCKS_DISPLAY} more blocks • • •
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Styles para animaciones */}
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            background-color: rgb(37 99 235);
          }
          50% {
            opacity: 0.7;
            background-color: rgb(59 130 246);
          }
        }
      `}</style>
    </div>
  );
}