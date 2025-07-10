import React, { useState, useMemo } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { NetworkFormData, BesuNetwork } from "@/types/besu";
import { validateNetworkConfig } from "@/lib/besu-utils";
import { LoadingSpinner } from "@/components/UIComponents";

// Validation schema
const networkSchema = z.object({
  name: z.string().min(1, "Network name is required").max(50, "Name too long"),
  chainId: z.number().min(1).max(999999),
  consensus: z.enum(["clique", "ibft2"]),
  gasLimit: z.string().regex(/^0x[0-9a-fA-F]+$/, "Invalid hex format"),
  blockTime: z.number().min(1).max(60),
  subnet: z
    .string()
    .regex(
      /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/,
      "Invalid subnet format (e.g. 172.16.0.0/16)"
    )
    .optional(),
  signerAccounts: z
    .array(
      z.object({
        address: z
          .string()
          .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address"),
        ethAmount: z.string().regex(/^\d+(\.\d+)?$/, "Invalid ETH amount"),
      })
    )
    .min(1, "At least one signer account required"),
  nodes: z
    .array(
      z.object({
        name: z.string().min(1, "Node name required"),
        type: z.enum(["bootnode", "miner", "rpc", "validator"]),
        rpcPort: z.number().min(8545).max(9999),
        p2pPort: z.number().min(30300).max(35000),
        ip: z
          .string()
          .regex(
            /^(\d{1,3}\.){3}\d{1,3}$/,
            "Invalid IP format (e.g. 172.16.0.10)"
          )
          .optional(),
      })
    )
    .min(1, "At least one node required"),
});

interface NetworkFormProps {
  network?: BesuNetwork;
  onSubmit: (data: NetworkFormData) => Promise<void>;
  onCancel: () => void;
}

export function NetworkForm({ network, onSubmit, onCancel }: NetworkFormProps) {
  const [submissionErrors, setSubmissionErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<NetworkFormData>({
    resolver: zodResolver(networkSchema),
    defaultValues: network
      ? {
          name: network.config?.name || "",
          chainId: network.config?.chainId || 1337,
          consensus: network.config?.consensus || "clique",
          gasLimit: network.config?.gasLimit || "0x1fffffffffffff",
          blockTime: network.config?.blockTime || 5,
          subnet: network.config?.subnet || "",
          signerAccounts: network.config?.signerAccounts?.map((account) => ({
            address: account.address,
            ethAmount: (() => {
              try {
                const wei = parseFloat(account.weiAmount || "0");
                return isNaN(wei)
                  ? "1000"
                  : (wei / Math.pow(10, 18)).toString();
              } catch {
                return "1000";
              }
            })(),
          })) || [{ address: "", ethAmount: "1000" }],
          nodes: network.nodes?.map((node) => ({
            name: node.name,
            type: node.type,
            rpcPort: node.rpcPort,
            p2pPort: node.p2pPort || 30303,
            ip: node.ip || "",
          })) || [
            {
              name: "bootnode1",
              type: "bootnode" as const,
              rpcPort: 8545,
              p2pPort: 30303,
              ip: "",
            },
          ],
        }
      : {
          name: "",
          chainId: 1337,
          consensus: "clique",
          gasLimit: "0x47E7C4",
          blockTime: 5,
          subnet: "",
          signerAccounts: [{ address: "", ethAmount: "1000" }],
          nodes: [
            {
              name: "bootnode1",
              type: "bootnode",
              rpcPort: 8545,
              p2pPort: 30303,
              ip: "",
            },
            {
              name: "miner1",
              type: "miner",
              rpcPort: 8546,
              p2pPort: 30304,
              ip: "",
            },
            {
              name: "rpc1",
              type: "rpc",
              rpcPort: 8547,
              p2pPort: 30305,
              ip: "",
            },
          ],
        },
  });

  const {
    fields: signerFields,
    append: appendSigner,
    remove: removeSigner,
  } = useFieldArray({
    control,
    name: "signerAccounts",
  });

  const {
    fields: nodeFields,
    append: appendNode,
    remove: removeNode,
  } = useFieldArray({
    control,
    name: "nodes",
  });

  const watchedData = watch();

  // Validate form data when it changes
  const validationErrors = useMemo(() => {
    try {
      return validateNetworkConfig(watchedData);
    } catch (error) {
      console.warn("Validation error:", error);
      return [];
    }
  }, [watchedData]);

  const onFormSubmit = async (data: NetworkFormData) => {
    try {
      setIsSubmitting(true);
      const errors = validateNetworkConfig(data);
      if (errors.length > 0) {
        setSubmissionErrors(errors);
        return;
      }

      setSubmissionErrors([]);
      try {
        await onSubmit(data);
      } catch (submitError) {
        console.error("API error during form submission:", submitError);
        setSubmissionErrors([
          submitError instanceof Error
            ? `API Error: ${submitError.message}`
            : "API Error: Unknown error occurred",
        ]);
        return; // Don't continue after API error
      }
    } catch (error) {
      console.error("Form submission error:", error);
      setSubmissionErrors([
        error instanceof Error ? error.message : "Unknown error occurred",
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {network ? "Edit Network" : "Create New Network"}
      </h2>

      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Basic Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Network Name
            </label>
            <input
              {...register("name")}
              type="text"
              readOnly={!!network}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                network ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              placeholder="My Besu Network"
            />
            {network && (
              <p className="text-xs text-gray-500 mt-1">
                Network name cannot be changed after creation
              </p>
            )}
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chain ID
            </label>
            <input
              {...register("chainId", { valueAsNumber: true })}
              type="number"
              readOnly={!!network}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                network ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
              placeholder="1337"
            />
            {network && (
              <p className="text-xs text-gray-500 mt-1">
                Chain ID cannot be changed after creation
              </p>
            )}
            {errors.chainId && (
              <p className="text-red-500 text-sm mt-1">
                {errors.chainId.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consensus Algorithm
            </label>
            <select
              {...register("consensus")}
              disabled={!!network}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                network ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            >
              <option value="clique">Clique (PoA)</option>
              <option value="ibft2">IBFT 2.0</option>
            </select>
            {network && (
              <p className="text-xs text-gray-500 mt-1">
                Consensus algorithm cannot be changed after creation
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Time (seconds)
            </label>
            <input
              {...register("blockTime", { valueAsNumber: true })}
              type="number"
              min="1"
              max="60"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="5"
            />
            {errors.blockTime && (
              <p className="text-red-500 text-sm mt-1">
                {errors.blockTime.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Gas Limit (hex)
            </label>
            <input
              {...register("gasLimit")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="0x47E7C4"
            />
            {errors.gasLimit && (
              <p className="text-red-500 text-sm mt-1">
                {errors.gasLimit.message}
              </p>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subnet (CIDR format)
            </label>
            <input
              {...register("subnet")}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              placeholder="172.16.0.0/16"
            />
            {errors.subnet && (
              <p className="text-red-500 text-sm mt-1">
                {errors.subnet.message}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Optional. If not provided, a subnet will be generated
              automatically. Subnet must be unique across all networks.
            </p>
          </div>
        </div>

        {/* Signer Accounts */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">
              Signer Accounts
            </h3>
            <button
              type="button"
              onClick={() => appendSigner({ address: "", ethAmount: "1000" })}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4" />
              Add Account
            </button>
          </div>

          <div className="space-y-3">
            {signerFields.map((field, index) => (
              <div key={field.id} className="flex gap-3 items-start">
                <div className="flex-1">
                  <input
                    {...register(`signerAccounts.${index}.address`)}
                    type="text"
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="w-32">
                  <input
                    {...register(`signerAccounts.${index}.ethAmount`)}
                    type="text"
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeSigner(index)}
                  disabled={signerFields.length === 1}
                  className="p-2 text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Nodes */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-gray-900">Nodes</h3>
            <button
              type="button"
              onClick={() =>
                appendNode({
                  name: `node${nodeFields.length + 1}`,
                  type: "rpc",
                  rpcPort: 8545 + nodeFields.length,
                  p2pPort: 30303 + nodeFields.length,
                  ip: "", // Empty string for IP, will be generated if not provided
                })
              }
              disabled={!!network}
              className={`flex items-center gap-1 px-3 py-1 rounded-md ${
                network
                  ? "bg-gray-400 text-gray-600 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <PlusIcon className="h-4 w-4" />
              Add Node
            </button>
          </div>
          {network && (
            <p className="text-xs text-gray-500 mb-3">
              Node structure cannot be modified in existing networks. You can
              only edit ports and IP addresses.
            </p>
          )}

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3 items-start">
              <div className="col-span-2 text-sm font-medium text-gray-700">
                Name
              </div>
              <div className="col-span-2 text-sm font-medium text-gray-700">
                Type
              </div>
              <div className="col-span-2 text-sm font-medium text-gray-700">
                RPC Port
              </div>
              <div className="col-span-2 text-sm font-medium text-gray-700">
                P2P Port
              </div>
              <div className="col-span-3 text-sm font-medium text-gray-700">
                IP Address (optional)
              </div>
              <div className="col-span-1"></div>
            </div>
            {nodeFields.map((field, index) => (
              <div
                key={field.id}
                className="grid grid-cols-12 gap-3 items-start"
              >
                <input
                  {...register(`nodes.${index}.name`)}
                  type="text"
                  readOnly={!!network}
                  placeholder="Node name"
                  className={`col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    network ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                />
                <select
                  {...register(`nodes.${index}.type`)}
                  disabled={!!network}
                  className={`col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                    network ? "bg-gray-100 cursor-not-allowed" : ""
                  }`}
                >
                  <option value="bootnode">Bootnode</option>
                  <option value="miner">Miner</option>
                  <option value="rpc">RPC</option>
                  <option value="validator">Validator</option>
                </select>
                <input
                  {...register(`nodes.${index}.rpcPort`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min="8545"
                  max="9999"
                  placeholder="8545"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <input
                  {...register(`nodes.${index}.p2pPort`, {
                    valueAsNumber: true,
                  })}
                  type="number"
                  min="30300"
                  max="35000"
                  placeholder="30303"
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
                <div className="col-span-3">
                  <input
                    {...register(`nodes.${index}.ip`)}
                    type="text"
                    placeholder="IP (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be within the subnet range if specified
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeNode(index)}
                  disabled={nodeFields.length === 1 || !!network}
                  className="col-span-1 p-2 text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Errors */}
        {(validationErrors.length > 0 || submissionErrors.length > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h4 className="text-red-800 font-medium mb-2">
              {submissionErrors.length > 0
                ? "Submission Errors:"
                : "Validation Errors:"}
            </h4>
            <ul className="text-red-700 text-sm space-y-1">
              {submissionErrors.length > 0
                ? submissionErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))
                : validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting || validationErrors.length > 0}
            className="flex-1 inline-flex items-center justify-center bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">
                  {network ? "Updating..." : "Creating..."}
                </span>
              </>
            ) : network ? (
              "Update Network"
            ) : (
              "Create Network"
            )}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
