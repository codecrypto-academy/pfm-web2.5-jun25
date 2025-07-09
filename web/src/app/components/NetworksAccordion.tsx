import React from "react";
import { Alert, Loader, Accordion, Badge, Group, Text, Button, Menu } from "@mantine/core";
import { IconAlertCircle, IconDots, IconTrash, IconPlus } from "@tabler/icons-react";
import dynamic from "next/dynamic";
// Use require to avoid type issues with dynamic import for props
const NodesList = require("./NodesList").default;

interface Network {
  networkId: string;
  chainId: number;
  subnet: string;
  gateway: string;
  nodesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface NetworksAccordionProps {
  data: { success: boolean; networks: Network[] };
  error: unknown;
  isLoading: boolean;
  onDeleteNetwork?: (networkId: string) => void;
  onAddNode?: (networkId: string) => void;
}

const NetworksAccordion: React.FC<NetworksAccordionProps> = ({ data, error, isLoading, onDeleteNetwork, onAddNode }) => {
  if (isLoading) return <Loader />;
  if (error)
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="Error loading networks" mb="md">
        {(error as any)?.message || "Unknown error"}
      </Alert>
    );
  if (!data || !Array.isArray((data as any).networks) || !(data as any).success)
    return (
      <Alert icon={<IconAlertCircle size={16} />} color="red" title="API Error" mt="md">
        {(data as any)?.error || "Failed to load networks."}
      </Alert>
    );

  // Accordions always open: render all panels open, controls not interactive
  return (
    <Accordion variant="separated" multiple value={data.networks.map(n => n.networkId)}>
      {data.networks.map((network) => (
        <Accordion.Item key={network.networkId} value={network.networkId}>
          <Accordion.Control disabled={false} style={{ pointerEvents: 'none', background: 'transparent' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', minWidth: 0 }}>
                <span style={{
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: 'inline-block',
                }}>{network.networkId}</span>
                <Badge color="blue" variant="light">
                  {network.nodesCount} nodes
                </Badge>
                <Badge color="gray" variant="light">
                  Chain ID: {network.chainId}
                </Badge>
                <Badge color="gray" variant="light">
                  Subnet: {network.subnet}
                </Badge>
              </div>
              <span style={{ pointerEvents: 'auto', paddingRight: 10 }}>
                <Menu shadow="md" width={180} position="bottom-end">
                  <Menu.Target>
                    <span
                      onClick={e => e.stopPropagation()}
                      tabIndex={0}
                      aria-label="Network actions"
                      style={{ display: 'inline-flex' }}
                    >
                      <IconDots size={18} style={{ cursor: 'pointer' }} />
                    </span>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item leftSection={<IconTrash size={14} />} color="red" onClick={() => onDeleteNetwork && onDeleteNetwork(network.networkId)}>
                      Delete Network
                    </Menu.Item>
                    <Menu.Item leftSection={<IconPlus size={14} />} onClick={() => onAddNode && onAddNode(network.networkId)}>
                      Add Node
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </span>
            </div>
          </Accordion.Control>
          <Accordion.Panel>
            <NodesList networkId={network.networkId} showFullAddress />
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
};

export default NetworksAccordion;
