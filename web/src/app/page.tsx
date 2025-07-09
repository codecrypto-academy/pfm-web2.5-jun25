"use client";

import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Box, Group, Button } from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import Header from "./components/Header";
import NetworksAccordion from "./components/NetworksAccordion";
import { confirmDeleteNetwork } from "./components/confirmDeleteNetwork";
import CreateNetworkFormModal from "./components/CreateNetworkFormModal";
import AddNodeFormModal from "./components/AddNodeFormModal";
// Types and interfaces moved to components/

const useNetworks = () =>
  useQuery<{ success: boolean; networks: any[]; error?: string }>({
    queryKey: ["networks"],
    queryFn: async () => {
      const res = await fetch("/api/networks");
      return res.json();
    },
  });

const AddNodeModal = ({ networkId, onClose, onSuccess }: { networkId: string; onClose: () => void; onSuccess: () => void }) => {
  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset } = useForm<any>();
  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch(`/api/networks/${networkId}/nodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        showNotification({
          title: "Node Added",
          message: `Node added to network '${networkId}' successfully!`,
          color: "green",
          position: "bottom-right",
        });
        reset();
        onSuccess();
      } else {
        showNotification({
          title: "Error",
          message: data.error || "Failed to add node.",
          color: "red",
        });
      }
    },
    onError: (e: any) => {
      showNotification({
        title: "Error",
        message: e.message,
        color: "red",
      });
    },
  });

  const onSubmit = (values: any) => {
    // Map 'name' to 'node_id' if present, and remove 'name' from payload
    const { name, ...rest } = values;
    const payload = name ? { ...rest, node_id: name } : rest;
    mutation.mutate(payload);
  };

  return (
    <Box style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Box bg="white" p="xl" style={{ borderRadius: 8, minWidth: 400, maxWidth: 480 }}>
        <h2>Add Node to Network</h2>
        <AddNodeFormModal
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          errors={errors}
          control={control}
          register={register}
          handleSubmit={handleSubmit}
        />
        <Group justify="flex-end" mt="md">
          <Button onClick={onClose} variant="outline" color="gray">Cancel</Button>
        </Group>
      </Box>
    </Box>
  );
};

const Home: React.FC = () => {
  const { data, isLoading, error } = useNetworks();
  const queryClient = useQueryClient();

  const openCreateNetworkModal = () => {
    modals.open({
      title: "Create New Network",
      children: (
        <CreateNetworkFormModalWrapper
          onSuccess={() => {
            modals.closeAll();
            setTimeout(() => {
              queryClient.invalidateQueries({ queryKey: ["networks"] });
            }, 5000);
          }}
        />
      ),
      centered: true,
      size: "lg",
    });
  };


  // Add Node Modal logic
  const [addNodeNetworkId, setAddNodeNetworkId] = React.useState<string | null>(null);
  const handleOpenAddNode = (networkId: string) => setAddNodeNetworkId(networkId);
  const handleCloseAddNode = () => setAddNodeNetworkId(null);

  // Network Delete logic
  const deleteNetworkMutation = useMutation({
    mutationFn: async (networkId: string) => {
      const res = await fetch(`/api/networks/${networkId}`, { method: "DELETE" });
      return res.json();
    },
    onSuccess: (data, networkId) => {
      if (data.success) {
        showNotification({
          title: "Network Deleted",
          message: `Network '${networkId}' deleted successfully!`,
          color: "green",
          position: "bottom-right",
        });
        queryClient.invalidateQueries({ queryKey: ["networks"] });
      } else {
        showNotification({
          title: "Error",
          message: data.error || "Failed to delete network.",
          color: "red",
        });
      }
    },
    onError: (e: any) => {
      showNotification({
        title: "Error",
        message: e.message,
        color: "red",
      });
    },
  });

  const handleDeleteNetwork = (networkId: string) => {
    confirmDeleteNetwork({
      networkId,
      onConfirm: () => deleteNetworkMutation.mutate(networkId),
    });
  };

  // Move AddNodeModal above return to avoid use-before-assign error
  let addNodeModal = null;
  if (addNodeNetworkId) {
    addNodeModal = (
      <AddNodeModal
        networkId={addNodeNetworkId}
        onClose={handleCloseAddNode}
        onSuccess={() => {
          handleCloseAddNode();
          queryClient.invalidateQueries({ queryKey: ["networks"] });
          if (addNodeNetworkId) {
            queryClient.invalidateQueries({ queryKey: ["nodes", addNodeNetworkId] });
          }
        }}
      />
    );
  }

  return (
    <Box p="lg">
      <Header
        onAddNetwork={openCreateNetworkModal}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["networks"] })}
      />
      <p style={{ marginBottom: 24 }}>Manage your Hyperledger Besu networks and nodes.</p>
      <NetworksAccordion
        data={data as any}
        error={error}
        isLoading={isLoading}
        onAddNode={handleOpenAddNode}
        onDeleteNetwork={handleDeleteNetwork}
      />
      {addNodeModal}
    </Box>
  );
};

// Wrapper for CreateNetworkFormModal to keep logic in page
import { useForm } from "react-hook-form";
const CreateNetworkFormModalWrapper: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<any>();

  const onSubmit = async (
    values: any
  ) => {
    const bootnodeCount = 1;
    const minerCount = values.minerCount || 0;
    const nodeCount = bootnodeCount + minerCount;
    const payload = {
      ...values,
      bootnodeCount,
      nodeCount,
    };
    try {
      const res = await fetch("/api/networks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification({
          title: "Network Created",
          message: `Network '${values.networkId}' created successfully!\nWaiting 5 seconds to refresh the network list...`,
          color: "green",
          position: "bottom-right",
        });
        onSuccess();
      } else {
        showNotification({
          title: "Error",
          message: data.error || "Failed to create network.",
          color: "red",
        });
      }
    } catch (e) {
      showNotification({
        title: "Error",
        message: (e as Error).message,
        color: "red",
      });
    }
  };

  return (
    <CreateNetworkFormModal
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      errors={errors}
      control={control}
      register={register}
      handleSubmit={handleSubmit}
    />
  );
};

export default Home;
