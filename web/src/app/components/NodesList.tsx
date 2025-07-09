import React from "react";
import { Alert, Loader, Stack, Card, Group, Text, Badge, Button } from "@mantine/core";
import { IconAlertCircle, IconTrash } from "@tabler/icons-react";

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

interface NodesListProps {
  networkId: string;
}


import { useQuery } from "@tanstack/react-query";
const useNodes = (networkId: string) =>
  useQuery<{ success: boolean; nodes: any[]; error?: string }>({
    queryKey: ["nodes", networkId],
    queryFn: async () => {
      const res = await fetch(`/api/networks/${networkId}/nodes`);
      return res.json();
    },
    enabled: Boolean(networkId),
  });

const NodesList: React.FC<NodesListProps> = ({ networkId }) => {
  // @ts-ignore
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
            <Badge color={node.type === "miner" ? "yellow" : "blue"}>{node.type}</Badge>
            <Badge color="gray">IP: {node.ip}</Badge>
            <Badge color="gray">RPC: {node.rpcPort}</Badge>
            <Badge color="gray">P2P: {node.p2pPort}</Badge>
            <Badge color="gray">Address: {node.address.slice(0, 10)}...</Badge>
            {node.containerStatus && (
              <Badge color={node.containerStatus.state === "running" ? "green" : "red"}>
                {node.containerStatus.state}
              </Badge>
            )}
            <Button variant="subtle" color="red" size="xs">
              <IconTrash size={16} />
            </Button>
          </Group>
        </Card>
      ))}
    </Stack>
  );
};

export default NodesList;
