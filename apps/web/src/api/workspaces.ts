import { router } from "react-query-kit";
import { z } from "zod";

import { api } from "./client";

const workspaceSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const workspaceNameSchema = z
    .string()
    .trim()
    .min(1, "Workspace name is required.")
    .max(255, "Workspace name must be 255 characters or fewer.");

export const workspaceSchema = z.object({
    id: z.uuid(),
    name: workspaceNameSchema,
    slug: z.string().trim().min(1).max(255).regex(workspaceSlugPattern),
});

export const workspacesSchema = z.array(workspaceSchema);
export const createWorkspaceSchema = z.object({
    name: workspaceNameSchema,
    slug: z.string().trim().min(1).max(255).regex(workspaceSlugPattern),
});

export type Workspace = z.infer<typeof workspaceSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export function slugifyWorkspaceName(name: string) {
    const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-");

    return slug;
}

export const workspacesApi = router("workspaces", {
    list: router.query({
        async fetcher(_variables: void, { signal }) {
            const response = await api.get("/api/workspaces", { signal }).json();
            return workspacesSchema.parse(response);
        },
    }),
    detail: router.query({
        async fetcher(workspaceId: Workspace["id"], { signal }) {
            const response = await api
                .get(`/api/workspaces/${workspaceId}`, { signal })
                .json();

            return workspaceSchema.parse(response);
        },
    }),
    create: router.mutation({
        async mutationFn(input: CreateWorkspaceInput) {
            const response = await api
                .post("/api/workspaces", {
                    json: createWorkspaceSchema.parse(input),
                })
                .json();

            return workspaceSchema.parse(response);
        },
    }),
});
