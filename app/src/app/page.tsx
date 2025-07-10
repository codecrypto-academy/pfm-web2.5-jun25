"use client";

import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { NetworkCard } from "@/components/NetworkCard";
import { NetworkForm } from "@/components/NetworkForm";
import {
  LoadingSpinner,
  ErrorMessage,
  EmptyState,
} from "@/components/UIComponents";
import { BesuNetwork, NetworkFormData } from "@/types/besu";
import { formDataToBesuConfig } from "@/lib/besu-utils";

export default function NetworksPage() {
  const [networks, setNetworks] = useState<BesuNetwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<BesuNetwork | null>(
    null
  );
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    const fetchNetworks = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/networks");
        if (!response.ok) {
          throw new Error("Failed to fetch networks");
        }
        const data = await response.json();
        // Extract networks array from the API response structure
        setNetworks(data.data?.networks || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchNetworks();
  }, []);

  const fetchNetworks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/networks");
      if (!response.ok) {
        throw new Error("Failed to fetch networks");
      }
      const data = await response.json();
      // Extract networks array from the API response structure
      setNetworks(data.data?.networks || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    fetchNetworks();
  };

  const handleCreateNetwork = async (formData: NetworkFormData) => {
    try {
      setError(null);
      const { config, nodes } = formDataToBesuConfig(formData);
      const response = await fetch("/api/networks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, nodes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Network creation error:", errorData);
        throw new Error(
          errorData.error ||
            `Failed to create network: ${response.status} ${response.statusText}`
        );
      }

      await fetchNetworks();
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleUpdateNetwork = async (id: string, formData: NetworkFormData) => {
    try {
      setError(null);

      // First check if network exists
      const checkResponse = await fetch(`/api/networks/${id}`);
      if (!checkResponse.ok) {
        const errorData = await checkResponse.json();
        console.error("Network not found:", errorData);
        throw new Error(errorData.error || `Network with ID ${id} not found`);
      }

      const { config, nodes } = formDataToBesuConfig(formData);
      const response = await fetch(`/api/networks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ config, nodes }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update network error:", errorData);
        throw new Error(
          errorData.error ||
            `Failed to update network: ${response.status} ${response.statusText}`
        );
      }

      await fetchNetworks();
      setEditingNetwork(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleDeleteNetwork = async (id: string) => {
    if (!confirm("Are you sure you want to delete this network?")) {
      return;
    }

    try {
      setError(null);

      // First check if network exists
      try {
        const checkResponse = await fetch(`/api/networks/${id}`);
        if (!checkResponse.ok) {
          console.warn(`Network ${id} not found, might already be deleted`);
          // Refresh the list anyway to update the UI
          await fetchNetworks();
          return;
        }
      } catch (checkError) {
        console.warn("Error checking network existence:", checkError);
        // Continue with deletion attempt anyway
      }

      // Attempt to delete the network
      const response = await fetch(`/api/networks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Delete network error:", errorData);
        throw new Error(
          errorData.error ||
            `Failed to delete network: ${response.status} ${response.statusText}`
        );
      }

      console.log(`Network ${id} deleted successfully`);
      await fetchNetworks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleStartNetwork = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/networks/${id}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start network");
      }

      await fetchNetworks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleStopNetwork = async (id: string) => {
    try {
      setError(null);
      const response = await fetch(`/api/networks/${id}/stop`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to stop network");
      }

      await fetchNetworks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleCleanupAll = async () => {
    if (
      !confirm(
        "Are you sure you want to cleanup all networks? This will stop and remove all network containers."
      )
    ) {
      return;
    }

    try {
      setCleaningUp(true);
      setError(null);
      const response = await fetch("/api/cleanup", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cleanup networks");
      }

      await fetchNetworks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setCleaningUp(false);
    }
  };

  const handleEditNetwork = async (network: BesuNetwork) => {
    try {
      // Check if the network still exists
      const response = await fetch(`/api/networks/${network.id}`);
      if (!response.ok) {
        throw new Error(
          `Network with ID ${network.id} not found. It may have been deleted or the server was restarted.`
        );
      }

      setEditingNetwork(network);
      setShowForm(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network not found");
      // Refresh the list to remove stale networks
      fetchNetworks();
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingNetwork(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner message="Loading networks..." size="lg" />
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Besu Networks</h1>
          <p className="text-gray-600">
            Manage your Hyperledger Besu blockchain networks
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleCleanupAll}
            disabled={cleaningUp}
            className="inline-flex items-center px-4 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            {cleaningUp ? "Cleaning..." : "Cleanup All"}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Network
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6">
          <ErrorMessage
            title="Network Operation Failed"
            message={error}
            onRetry={handleRetry}
          />
        </div>
      )}

      {/* Network Form */}
      {showForm && (
        <div className="mb-6 bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            {editingNetwork ? "Edit Network" : "Create New Network"}
          </h2>
          <NetworkForm
            network={editingNetwork || undefined}
            onSubmit={
              editingNetwork
                ? (formData) => handleUpdateNetwork(editingNetwork.id, formData)
                : handleCreateNetwork
            }
            onCancel={handleCancelForm}
          />
        </div>
      )}

      {/* Networks List */}
      {networks.length === 0 ? (
        <EmptyState
          title="No networks found"
          description="Get started by creating your first Besu network. You can configure consensus mechanism, nodes, and signer accounts."
          actionLabel="Create Network"
          onAction={() => setShowForm(true)}
          icon={<PlusIcon className="mx-auto h-12 w-12 text-gray-400" />}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {networks.map((network) => (
            <NetworkCard
              key={network.id}
              network={network}
              onEdit={handleEditNetwork}
              onDelete={handleDeleteNetwork}
              onStart={handleStartNetwork}
              onStop={handleStopNetwork}
            />
          ))}
        </div>
      )}
    </div>
  );
}
