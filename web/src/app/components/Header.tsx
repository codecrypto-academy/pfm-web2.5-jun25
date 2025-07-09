import React from "react";
import { Group, Text, Button } from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";

interface HeaderProps {
  onAddNetwork: () => void;
  onRefresh: () => void;
}

const Header: React.FC<HeaderProps> = ({ onAddNetwork, onRefresh }) => (
  <Group justify="space-between" mb="md">
    <Text component="h1" size="xl" fw={700}>
      Besu Network Manager
    </Text>
    <Group>
      <Button
        leftSection={<IconPlus size={16} />}
        onClick={onAddNetwork}
        variant="filled"
        color="blue"
      >
        Add Network
      </Button>
      <Button
        variant="outline"
        color="gray"
        onClick={onRefresh}
      >
        Refresh Networks
      </Button>
    </Group>
  </Group>
);

export default Header;
