"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Group,
  Text,
  Title,
  Stack,
  Loader,
  Accordion,
  Badge,
  Box,
  Alert,
  Button,
  NumberInput,
  TextInput,
} from "@mantine/core";
import { IconAlertCircle, IconPlus } from "@tabler/icons-react";
import { useForm, Controller } from "react-hook-form";
import { modals } from "@mantine/modals";
import { showNotification } from "@mantine/notifications";
interface CreateNetworkForm {
  name: string;
  networkId: string;
  chainId: number;
  // nodeCount is now omitted from the form, will be calculated on submit
  subnet?: string;
  gateway?: string;
  baseRpcPort?: number;
  baseP2pPort?: number;
  bootnodeCount?: number;
  minerCount?: number;
  besuImage?: string;
  memoryLimit?: string;
  cpuLimit?: string;
}

interface Node {
  id: string;
  type: string;
  ip: string;
  rpcPort: number;
  p2pPort: number;
  address: string;
  enode?: string;
  containerStatus?: {
    containerId: string;
    state: string;
    status: string;
  } | null;
}

interface Network {
  networkId: string;
  chainId: number;
  subnet: string;
  gateway: string;
  nodesCount: number;
  createdAt: string;
  updatedAt: string;
}

const useNetworks = () =>
  useQuery<{ success: boolean; networks: Network[]; error?: string }>({
    queryKey: ["networks"],
    queryFn: async () => {
      const res = await fetch("/api/networks");
      return res.json();
    },
    // refetchInterval: 10000,
  });

const useNodes = (networkId: string) =>
  useQuery<{ success: boolean; nodes: Node[]; error?: string }>({
    queryKey: ["nodes", networkId],
    queryFn: async () => {
      const res = await fetch(`/api/networks/${networkId}/nodes`);
      return res.json();
    },
    enabled: Boolean(networkId),
    // refetchInterval: 10000,
  });

const Home: React.FC = () => {
  const { data, isLoading, error } = useNetworks();
  const queryClient = useQueryClient();

  const openCreateNetworkModal = () => {
    modals.open({
      title: (
        <Group>
          <IconPlus size={18} />
          <Text fw={500}>Create New Network</Text>
        </Group>
      ),
      children: (
        <CreateNetworkFormModal
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
      <Group justify="space-between" mb="md">
        <Title order={1}>Besu Network Manager</Title>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={openCreateNetworkModal}
            variant="filled"
            color="blue"
          >
            Add Network
          </Button>
          <Button
            variant="outline"
            color="gray"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["networks"] })}
          >
            Refresh Networks
          </Button>
        </Group>
      </Group>
      <Text mb="lg">Manage your Hyperledger Besu networks and nodes.</Text>
      {isLoading && <Loader />}
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          title="Error loading networks"
          mb="md"
        >
          {(error as any)?.message || "Unknown error"}
        </Alert>
      )}
      {data &&
        Array.isArray((data as any).networks) &&
        (data as any).success && (
          <Accordion variant="separated">
            {((data as any).networks as Network[]).map((network) => (
              <Accordion.Item key={network.networkId} value={network.networkId}>
                <Accordion.Control>
                  <Group>
                    <Text fw={500}>{network.networkId}</Text>
                    <Badge color="blue" variant="light">
                      {network.nodesCount} nodes
                    </Badge>
                    <Badge color="gray" variant="light">
                      Chain ID: {network.chainId}
                    </Badge>
                    <Badge color="gray" variant="light">
                      Subnet: {network.subnet}
                    </Badge>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <NodesList networkId={network.networkId} />
                </Accordion.Panel>
              </Accordion.Item>
            ))}
          </Accordion>
        )}
      {data &&
        (!Array.isArray((data as any).networks) || !(data as any).success) && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            color="red"
            title="API Error"
            mt="md"
          >
            {(data as any).error || "Failed to load networks."}
          </Alert>
        )}
    </Box>
  );
};
export default Home;

const CreateNetworkFormModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateNetworkForm>();

  const onSubmit = async (
    values: Omit<CreateNetworkForm, "nodeCount"> & { nodeCount?: number }
  ) => {
    // Always force bootnodeCount to 1, and calculate nodeCount as bootnodeCount + minerCount (default 0 if undefined)
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
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        <Group grow wrap="wrap">
          <TextInput
            label="Network Name"
            placeholder="e.g. Test Network"
            {...register("name", { required: true, minLength: 3 })}
            error={errors.name && "Required (min 3 chars)"}
            style={{ minWidth: 0 }}
          />
          <TextInput
            label="Network ID"
            placeholder="e.g. testnet-01"
            {...register("networkId", { required: true, minLength: 3 })}
            error={errors.networkId && "Required (min 3 chars)"}
            style={{ minWidth: 0 }}
          />
        </Group>
        <Group grow wrap="wrap">
          <Controller
            name="chainId"
            control={control}
            rules={{ required: true, min: 1 }}
            render={({ field }) => (
              <NumberInput
                label="Chain ID"
                placeholder="e.g. 1337"
                value={field.value}
                onChange={field.onChange}
                error={errors.chainId && "Required (number)"}
                min={1}
                max={999999999}
                step={1}
                allowDecimal={false}
                style={{ minWidth: 0 }}
              />
            )}
          />
        </Group>
        <Group grow wrap="wrap">
          <TextInput
            label="Subnet (CIDR)"
            placeholder="e.g. 172.21.0.0/24"
            {...register("subnet")}
            style={{ minWidth: 0 }}
          />
          <TextInput
            label="Gateway"
            placeholder="e.g. 172.21.0.1"
            {...register("gateway")}
            style={{ minWidth: 0 }}
          />
        </Group>
        <Group grow wrap="wrap">
          <Controller
            name="baseRpcPort"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Base RPC Port"
                placeholder="e.g. 8545"
                value={field.value}
                onChange={field.onChange}
                style={{ minWidth: 0 }}
              />
            )}
          />
          <Controller
            name="baseP2pPort"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Base P2P Port"
                placeholder="e.g. 30303"
                value={field.value}
                onChange={field.onChange}
                style={{ minWidth: 0 }}
              />
            )}
          />
        </Group>
        <Group grow wrap="wrap">
          <Controller
            name="bootnodeCount"
            control={control}
            defaultValue={1}
            render={({ field }) => (
              <NumberInput
                label="Bootnode Count"
                value={1}
                disabled
                style={{ minWidth: 0 }}
              />
            )}
          />
          <Controller
            name="minerCount"
            control={control}
            render={({ field }) => (
              <NumberInput
                label="Miner Count"
                placeholder="e.g. 1"
                value={field.value}
                onChange={field.onChange}
                style={{ minWidth: 0 }}
              />
            )}
          />
        </Group>
        <Group grow wrap="wrap">
          <TextInput
            label="Besu Docker Image"
            placeholder="e.g. hyperledger/besu:latest"
            defaultValue="hyperledger/besu:latest"
            {...register("besuImage")}
            style={{ minWidth: 0 }}
          />
          <TextInput
            label="Memory Limit"
            placeholder="e.g. 2g"
            {...register("memoryLimit")}
            style={{ minWidth: 0 }}
          />
          <TextInput
            label="CPU Limit"
            placeholder="e.g. 1.0"
            {...register("cpuLimit")}
            style={{ minWidth: 0 }}
          />
        </Group>
        <Group justify="flex-end">
          <Button type="submit" loading={isSubmitting} color="blue">
            Create Network
          </Button>
        </Group>
      </Stack>
    </form>
  );
};

const NodesList: React.FC<{ networkId: string }> = ({ networkId }) => {
  const { data, isLoading, error } = useNodes(networkId);

  if (isLoading) return <Loader size="sm" />;
  if (error)
    return (
      <Alert
        icon={<IconAlertCircle size={16} />}
        color="red"
        title="Error loading nodes"
      >
        {(error as any)?.message || "Unknown error"}
      </Alert>
    );
  if (!data || !Array.isArray((data as any).nodes) || !(data as any).success)
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="API Error">
        {(data as any)?.error || "Failed to load nodes."}
      </Alert>
    );

  return (
    <Stack>
      {(data as any).nodes.length === 0 && (
        <Text color="dimmed">No nodes found for this network.</Text>
      )}
      {(data as any).nodes.map((node: Node) => (
        <Card key={node.id} shadow="xs" radius="md" withBorder>
          <Group style={{ justifyContent: "space-between", width: "100%" }}>
            <Text fw={500}>{node.id}</Text>
            <Badge color={node.type === "miner" ? "yellow" : "blue"}>
              {node.type}
            </Badge>
            <Badge color="gray">IP: {node.ip}</Badge>
            <Badge color="gray">RPC: {node.rpcPort}</Badge>
            <Badge color="gray">P2P: {node.p2pPort}</Badge>
            <Badge color="gray">Address: {node.address.slice(0, 10)}...</Badge>
            {node.containerStatus && (
              <Badge
                color={
                  node.containerStatus.state === "running" ? "green" : "red"
                }
              >
                {node.containerStatus.state}
              </Badge>
            )}
          </Group>
        </Card>
      ))}
    </Stack>
  );
};
