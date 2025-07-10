import React from "react";
import { Button, Group, NumberInput, Stack, TextInput } from "@mantine/core";
import { Controller, useForm } from "react-hook-form";

interface CreateNetworkForm {
  name: string;
  networkId: string;
  chainId: number;
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

interface CreateNetworkFormModalProps {
  onSubmit: (values: Omit<CreateNetworkForm, "nodeCount"> & { nodeCount?: number }) => void;
  isSubmitting: boolean;
  errors: any;
  control: any;
  register: any;
  handleSubmit: any;
}

const CreateNetworkFormModal: React.FC<CreateNetworkFormModalProps> = ({
  onSubmit,
  isSubmitting,
  errors,
  control,
  register,
  handleSubmit,
}) => (
  <form data-testid="form" onSubmit={handleSubmit(onSubmit)}>
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

export default CreateNetworkFormModal;
