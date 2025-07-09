"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Box } from "@mantine/core";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
import Header from "./components/Header";
import NetworksAccordion from "./components/NetworksAccordion";
import CreateNetworkFormModal from "./components/CreateNetworkFormModal";
// Types and interfaces moved to components/

const useNetworks = () =>
  useQuery<{ success: boolean; networks: any[]; error?: string }>({
    queryKey: ["networks"],
    queryFn: async () => {
      const res = await fetch("/api/networks");
      return res.json();
    },
  });

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

  return (
    <Box p="lg">
      <Header
        onAddNetwork={openCreateNetworkModal}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: ["networks"] })}
      />
      <p style={{ marginBottom: 24 }}>Manage your Hyperledger Besu networks and nodes.</p>
      <NetworksAccordion data={data as any} error={error} isLoading={isLoading} />
    </Box>
  );
};
export default Home;

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
