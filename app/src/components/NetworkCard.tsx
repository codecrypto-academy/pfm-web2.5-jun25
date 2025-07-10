import { BesuNetwork } from "@/types/besu";
import {
  PlayIcon,
  StopIcon,
  TrashIcon,
  PencilIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";
import { clsx } from "clsx";
import { useState } from "react";

interface NetworkCardProps {
  network: BesuNetwork;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onEdit: (network: BesuNetwork) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export function NetworkCard({
  network,
  onStart,
  onStop,
  onEdit,
  onDelete,
  isLoading = false,
}: NetworkCardProps) {
  const [showNodeDetails, setShowNodeDetails] = useState(false);

  const getStatusColor = (status: BesuNetwork["status"]) => {
    switch (status) {
      case "running":
        return "text-green-600 bg-green-100";
      case "stopped":
        return "text-gray-600 bg-gray-100";
      case "starting":
        return "text-yellow-600 bg-yellow-100";
      case "stopping":
        return "text-orange-600 bg-orange-100";
      case "error":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getStatusIcon = (status: BesuNetwork["status"]) => {
    switch (status) {
      case "starting":
      case "stopping":
        return <ClockIcon className="h-4 w-4" />;
      case "error":
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const canStart = network.status === "stopped" && !isLoading;
  const canStop = network.status === "running" && !isLoading;
  const canEdit = network.status === "stopped" && !isLoading;
  const canDelete = network.status === "stopped" && !isLoading;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {network.config.name}
          </h3>
          <p className="text-sm text-gray-500">
            Chain ID: {network.config.chainId}
          </p>
        </div>
        <div
          className={clsx(
            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
            getStatusColor(network.status)
          )}
        >
          {getStatusIcon(network.status)}
          {network.status.charAt(0).toUpperCase() + network.status.slice(1)}
        </div>
      </div>

      {/* Network Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Consensus:</span>
          <span className="font-medium">
            {network.config.consensus.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Nodes:</span>
          <span className="font-medium">{network.nodes.length}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Block Time:</span>
          <span className="font-medium">{network.config.blockTime}s</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Subnet:</span>
          <span className="font-medium">{network.config.subnet}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Signer Accounts:</span>
          <span className="font-medium">
            {network.config.signerAccounts.length}
          </span>
        </div>
      </div>

      {/* Node Types */}
      <div className="mb-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 mb-2">Node Types:</p>
          <button
            onClick={() => setShowNodeDetails(!showNodeDetails)}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
          >
            {showNodeDetails ? (
              <>
                <ChevronUpIcon className="h-3 w-3 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-3 w-3 mr-1" />
                Show Details
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {Array.from(new Set(network.nodes.map((node) => node.type))).map(
            (type) => (
              <span
                key={type}
                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
              >
                {type}
              </span>
            )
          )}
        </div>

        {/* Node Details */}
        {showNodeDetails && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Node Details:
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
              {network.nodes.map((node) => (
                <div key={node.name} className="bg-gray-50 p-2 rounded text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium">{node.name}</span>
                    <span className="bg-blue-100 text-blue-800 px-1 rounded">
                      {node.type}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    <div>IP: {node.ip}</div>
                    <div>Port: {node.rpcPort}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-xs text-gray-400 mb-4">
        <p>Created: {new Date(network.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(network.updatedAt).toLocaleString()}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onStart(network.id)}
          disabled={!canStart}
          className={clsx(
            "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            canStart
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <PlayIcon className="h-4 w-4" />
          Start
        </button>

        <button
          onClick={() => onStop(network.id)}
          disabled={!canStop}
          className={clsx(
            "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            canStop
              ? "bg-orange-600 text-white hover:bg-orange-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <StopIcon className="h-4 w-4" />
          Stop
        </button>

        <button
          onClick={() => onEdit(network)}
          disabled={!canEdit}
          className={clsx(
            "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            canEdit
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <PencilIcon className="h-4 w-4" />
          Edit
        </button>

        <button
          onClick={() => onDelete(network.id)}
          disabled={!canDelete}
          className={clsx(
            "flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            canDelete
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          )}
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
