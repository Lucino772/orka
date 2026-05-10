import { router } from "react-query-kit";
import { z } from "zod";

import { api } from "./client";

export const nodeStatusSchema = z.enum(["online", "offline"]);
export const nodeHealthSchema = z.enum(["unknown", "healthy", "degraded", "error"]);
export const nodeActivitySeveritySchema = z.enum(["info", "warning", "error"]);

export const nodeSummarySchema = z.object({
    id: z.uuid(),
    workspace_id: z.uuid(),
    name: z.string(),
    status: nodeStatusSchema,
    health: nodeHealthSchema,
    has_secret: z.boolean().default(false),
    hostname: z.string().nullable().optional(),
    agent_version: z.string().nullable().optional(),
    os_name: z.string().nullable().optional(),
    os_version: z.string().nullable().optional(),
    cpu_core_count: z.number().int().nullable().optional(),
    ram_bytes: z.number().int().nullable().optional(),
    gpu_count: z.number().int().nullable().optional(),
    gpu_model: z.string().nullable().optional(),
});

export const createNodeSchema = z.object({
    name: z.string().trim().min(1).max(255),
});
export const renameNodeSchema = createNodeSchema;

export const nodeTokenResponseSchema = z.object({
    token: z.string(),
});

export const nodeGpuMetadataSchema = z.object({
    gpu_index: z.number().int(),
    vendor: z.string().nullable(),
    model: z.string().nullable(),
    vram_bytes: z.number().int().nullable(),
    device_name: z.string().nullable(),
    serial_number: z.string().nullable(),
    pci_bus_id: z.string().nullable(),
    metadata_updated_at: z.string(),
});

export const nodeMetadataSchema = z.object({
    agent_version: z.string().nullable(),
    hostname: z.string().nullable(),
    os_name: z.string().nullable(),
    os_version: z.string().nullable(),
    cpu_architecture: z.string().nullable(),
    cpu_core_count: z.number().int().nullable(),
    ram_bytes: z.number().int().nullable(),
    metadata_updated_at: z.string(),
    gpus: z.array(nodeGpuMetadataSchema),
});

export const nodeDetailSchema = nodeSummarySchema.extend({
    metadata: nodeMetadataSchema.nullable(),
});

export const nodeActivityEntrySchema = z.object({
    id: z.uuid(),
    event_type: z.string(),
    severity: nodeActivitySeveritySchema,
    occurred_at: z.string(),
    payload: z.record(z.string(), z.unknown()),
    message: z.string().nullable(),
});

export const nodeSummaryListSchema = z.array(nodeSummarySchema);
export const nodeActivityListSchema = z.array(nodeActivityEntrySchema);

export type NodeSummary = z.infer<typeof nodeSummarySchema>;
export type CreateNodeInput = z.infer<typeof createNodeSchema>;
export type RenameNodeInput = z.infer<typeof renameNodeSchema>;
export type CreateNodeResponse = z.infer<typeof nodeSummarySchema>;
export type NodeTokenResponse = z.infer<typeof nodeTokenResponseSchema>;
export type NodeDetail = z.infer<typeof nodeDetailSchema>;
export type NodeMetadata = z.infer<typeof nodeMetadataSchema>;
export type NodeGpuMetadata = z.infer<typeof nodeGpuMetadataSchema>;
export type NodeActivityEntry = z.infer<typeof nodeActivityEntrySchema>;

export const nodesApi = router("nodes", {
    list: router.query({
        async fetcher(variables: { workspaceId: string }, { signal }) {
            const response = await api
                .get(`/api/workspaces/${variables.workspaceId}/nodes`, { signal })
                .json();
            return nodeSummaryListSchema.parse(response);
        },
    }),
    detail: router.query({
        async fetcher(variables: { workspaceId: string; nodeId: string }, { signal }) {
            const response = await api
                .get(
                    `/api/workspaces/${variables.workspaceId}/nodes/${variables.nodeId}`,
                    { signal }
                )
                .json();
            return nodeDetailSchema.parse(response);
        },
    }),
    activity: router.query({
        async fetcher(variables: { workspaceId: string; nodeId: string }, { signal }) {
            const response = await api
                .get(
                    `/api/workspaces/${variables.workspaceId}/nodes/${variables.nodeId}/activity`,
                    { signal }
                )
                .json();
            return nodeActivityListSchema.parse(response);
        },
    }),
    create: router.mutation({
        async mutationFn(input: { workspaceId: string; data: CreateNodeInput }) {
            const response = await api
                .post(`/api/workspaces/${input.workspaceId}/nodes`, {
                    json: createNodeSchema.parse(input.data),
                })
                .json();
            return nodeSummarySchema.parse(response);
        },
    }),
    generateToken: router.mutation({
        async mutationFn(input: { workspaceId: string; nodeId: string }) {
            const response = await api
                .post(
                    `/api/workspaces/${input.workspaceId}/nodes/${input.nodeId}/token`
                )
                .json();
            return nodeTokenResponseSchema.parse(response);
        },
    }),
    rename: router.mutation({
        async mutationFn(input: {
            workspaceId: string;
            nodeId: string;
            data: RenameNodeInput;
        }) {
            const response = await api
                .patch(`/api/workspaces/${input.workspaceId}/nodes/${input.nodeId}`, {
                    json: renameNodeSchema.parse(input.data),
                })
                .json();
            return nodeSummarySchema.parse(response);
        },
    }),
    delete: router.mutation({
        async mutationFn(input: { workspaceId: string; nodeId: string }) {
            await api.delete(
                `/api/workspaces/${input.workspaceId}/nodes/${input.nodeId}`
            );
        },
    }),
});
