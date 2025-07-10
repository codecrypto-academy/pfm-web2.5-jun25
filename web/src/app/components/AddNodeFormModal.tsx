import React from "react";
import { Button, Group, NumberInput, Stack, Select } from "@mantine/core";
import { Controller, useForm } from "react-hook-form";

interface AddNodeForm {
  type: "miner" | "rpc" | "validator";
  name?: string; // This will be used as node_id
  rpcPort?: number;
  p2pPort?: number;
  memoryLimit?: string;
  cpuLimit?: string;
}

interface AddNodeFormModalProps {
  onSubmit: (values: AddNodeForm) => void;
  isSubmitting: boolean;
  errors: any;
  control: any;
  register: any;
  handleSubmit: any;
}

const AddNodeFormModal: React.FC<AddNodeFormModalProps> = ({
  onSubmit,
  isSubmitting,
  errors,
  control,
  register,
  handleSubmit,
}) => (
  <form data-testid="form" onSubmit={handleSubmit(onSubmit)}>
    <Stack>
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <input
            {...field}
            value={field.value ?? ''}
            type="text"
            placeholder="Node Name / ID (optional)"
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ced4da", marginBottom: 8 }}
          />
        )}
      />
      <Controller
        name="type"
        control={control}
        rules={{ required: true }}
        defaultValue="miner"
        render={({ field }) => (
          <Select
            label="Node Type"
            data={[
              { value: "miner", label: "Miner" },
              { value: "rpc", label: "RPC" },
              { value: "validator", label: "Validator" },
            ]}
            value={field.value}
            onChange={value => field.onChange(value || "")}
            error={errors.type && "Required"}
            required
            clearable={false}
            comboboxProps={{ withinPortal: false }}
          />
        )}
      />
      <Group grow wrap="wrap">
        <Controller
          name="rpcPort"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="RPC Port (optional)"
              value={field.value}
              onChange={field.onChange}
              style={{ minWidth: 0 }}
            />
          )}
        />
        <Controller
          name="p2pPort"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="P2P Port (optional)"
              value={field.value}
              onChange={field.onChange}
              style={{ minWidth: 0 }}
            />
          )}
        />
      </Group>
      <Group grow wrap="wrap">
        <Controller
          name="memoryLimit"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="Memory Limit (MB, optional)"
              value={field.value}
              onChange={field.onChange}
              style={{ minWidth: 0 }}
            />
          )}
        />
        <Controller
          name="cpuLimit"
          control={control}
          render={({ field }) => (
            <NumberInput
              label="CPU Limit (cores, optional)"
              value={field.value}
              onChange={field.onChange}
              style={{ minWidth: 0 }}
            />
          )}
        />
      </Group>
      <Group justify="flex-end">
        <Button type="submit" loading={isSubmitting} color="blue">
          Add Node
        </Button>
      </Group>
    </Stack>
  </form>
);

export default AddNodeFormModal;
