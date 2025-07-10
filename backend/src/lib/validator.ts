import { z } from 'zod';

export const BesuNodeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ip: z.string().ip('Invalid IP address'),
  port: z.number().optional(),
  isBootnode: z.boolean().optional(),
  isMiner: z.boolean().optional(),
  isRpc: z.boolean().optional(),
});

export const CreateNetworkSchema = z.object({
  networkName: z.string().min(1, 'Network name is required'),
  subnet: z.string().regex(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/, 'Invalid subnet format'),
  dataPath: z.string().optional(),
  nodes: z.array(BesuNodeSchema).min(1, 'At least one node is required'),
});

export const AddNodeSchema = z.object({
  networkName: z.string().min(1, 'Network name is required'),
  node: BesuNodeSchema,
});

export const RemoveNodeSchema = z.object({
  networkName: z.string().min(1, 'Network name is required'),
  nodeName: z.string().min(1, 'Node name is required'),
});

export const NetworkNameSchema = z.object({
  networkName: z.string().min(1, 'Network name is required'),
});

export const NodeLogsSchema = z.object({
  networkName: z.string().min(1, 'Network name is required'),
  nodeName: z.string().min(1, 'Node name is required'),
});

export type CreateNetworkInput = z.infer<typeof CreateNetworkSchema>;
export type AddNodeInput = z.infer<typeof AddNodeSchema>;
export type RemoveNodeInput = z.infer<typeof RemoveNodeSchema>;
export type NetworkNameInput = z.infer<typeof NetworkNameSchema>;
export type NodeLogsInput = z.infer<typeof NodeLogsSchema>;