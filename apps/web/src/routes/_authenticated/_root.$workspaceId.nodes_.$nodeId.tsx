import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import { nodesApi } from "@/api/nodes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActivityTimeline } from "@/features/nodes/activity-feed-preview";
import { OverviewConsole } from "@/features/nodes/node-detail-previews";
import { NodeSettingsPanel } from "@/features/nodes/node-settings-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
    tab: z.enum(["overview", "activity", "settings"]).optional(),
});

export const Route = createFileRoute(
    "/_authenticated/_root/$workspaceId/nodes_/$nodeId"
)({
    validateSearch: searchSchema,
    async loader({ context, params }) {
        await Promise.all([
            context.queryClient.ensureQueryData(
                nodesApi.detail.getFetchOptions({
                    workspaceId: params.workspaceId,
                    nodeId: params.nodeId,
                })
            ),
            context.queryClient.ensureQueryData(
                nodesApi.activity.getFetchOptions({
                    workspaceId: params.workspaceId,
                    nodeId: params.nodeId,
                })
            ),
        ]);
    },
    component: RouteComponent,
});

function RouteComponent() {
    const { workspaceId, nodeId } = Route.useParams();
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const { data: node } = nodesApi.detail.useSuspenseQuery({
        variables: { workspaceId, nodeId },
        refetchInterval: 3000,
    });
    const { data: activity } = nodesApi.activity.useSuspenseQuery({
        variables: { workspaceId, nodeId },
        refetchInterval: 3000,
    });
    const [isEditingName, setIsEditingName] = useState(false);
    const [draftName, setDraftName] = useState<string | null>(null);
    const [generatedToken, setGeneratedToken] = useState<string | null>(null);
    const latestError = activity.find((item) => item.event_type === "node.error");
    const renameNodeMutation = nodesApi.rename.useMutation({
        async onSuccess() {
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: nodesApi.detail.getKey({ workspaceId, nodeId }),
                }),
                queryClient.invalidateQueries({
                    queryKey: nodesApi.list.getKey({ workspaceId }),
                }),
            ]);
            setIsEditingName(false);
        },
    });
    const deleteNodeMutation = nodesApi.delete.useMutation({
        async onSuccess() {
            await queryClient.invalidateQueries({
                queryKey: nodesApi.list.getKey({ workspaceId }),
            });
            await navigate({
                to: "/$workspaceId/nodes",
                params: { workspaceId },
            });
        },
    });
    const generateTokenMutation = nodesApi.generateToken.useMutation();

    return (
        <section className="bg-background flex h-full min-h-0 min-w-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col py-5">
                <div className="flex flex-col gap-4 px-4 pb-5 sm:px-6">
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Link
                            to="/$workspaceId/nodes"
                            params={{ workspaceId }}
                            className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                        >
                            Nodes
                        </Link>
                        <span className="text-muted-foreground">/</span>
                        <span className="text-foreground font-medium">{node.name}</span>
                    </div>

                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                                {isEditingName ? (
                                    <form
                                        className="flex flex-wrap items-center gap-3"
                                        onSubmit={async (event) => {
                                            event.preventDefault();
                                            const nextName = (
                                                draftName ?? node.name
                                            ).trim();
                                            if (!nextName || nextName === node.name) {
                                                setDraftName(null);
                                                setIsEditingName(false);
                                                return;
                                            }
                                            await renameNodeMutation.mutateAsync({
                                                workspaceId,
                                                nodeId,
                                                data: { name: nextName },
                                            });
                                        }}
                                    >
                                        <div className="flex items-stretch">
                                            <Input
                                                value={draftName ?? node.name}
                                                className="h-9 w-64 rounded-r-none border-r-0 text-base md:text-sm"
                                                onChange={(event) =>
                                                    setDraftName(event.target.value)
                                                }
                                                disabled={renameNodeMutation.isPending}
                                                autoFocus
                                            />
                                            <div className="flex">
                                                <Button
                                                    type="submit"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 rounded-none border-r-0"
                                                    disabled={
                                                        renameNodeMutation.isPending
                                                    }
                                                    aria-label="Save node name"
                                                >
                                                    <svg
                                                        viewBox="0 0 16 16"
                                                        className="size-4"
                                                        aria-hidden="true"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="m3.5 8 3 3 6-6"
                                                            stroke="currentColor"
                                                            strokeWidth="1.5"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    className="h-9 rounded-l-none"
                                                    disabled={
                                                        renameNodeMutation.isPending
                                                    }
                                                    onClick={() => {
                                                        setDraftName(null);
                                                        setIsEditingName(false);
                                                    }}
                                                    aria-label="Cancel rename"
                                                >
                                                    <svg
                                                        viewBox="0 0 16 16"
                                                        className="size-4"
                                                        aria-hidden="true"
                                                        fill="none"
                                                    >
                                                        <path
                                                            d="M4 4 12 12M12 4 4 12"
                                                            stroke="currentColor"
                                                            strokeWidth="1.4"
                                                            strokeLinecap="round"
                                                        />
                                                    </svg>
                                                </Button>
                                            </div>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                                            {node.name}
                                        </h1>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => {
                                                setDraftName(node.name);
                                                setIsEditingName(true);
                                            }}
                                            disabled={
                                                isEditingName ||
                                                deleteNodeMutation.isPending
                                            }
                                            aria-label="Edit node name"
                                        >
                                            <svg
                                                viewBox="0 0 16 16"
                                                className="size-4"
                                                aria-hidden="true"
                                                fill="none"
                                            >
                                                <path
                                                    d="M11.8 2.7a1.5 1.5 0 1 1 2.1 2.1l-7.3 7.3-2.8.7.7-2.8 7.3-7.3Z"
                                                    stroke="currentColor"
                                                    strokeWidth="1.4"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                            </svg>
                                        </Button>
                                    </div>
                                )}
                                <StatusPill value={node.status} tone={node.status} />
                                <StatusPill value={node.health} tone={node.health} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={deleteNodeMutation.isPending}
                                onClick={async () => {
                                    if (
                                        !window.confirm(
                                            `Delete node "${node.name}"? This cannot be undone.`
                                        )
                                    ) {
                                        return;
                                    }
                                    await deleteNodeMutation.mutateAsync({
                                        workspaceId,
                                        nodeId,
                                    });
                                }}
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>

                {latestError || node.health === "error" ? (
                    <section className="mb-6 border-y border-red-200 bg-red-50 px-4 py-4 sm:px-6">
                        <h2 className="text-sm font-semibold text-red-800">
                            Node error
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-red-700">
                            {latestError?.message ??
                                "The backend marked this node as being in an error state."}
                        </p>
                    </section>
                ) : null}

                <Tabs
                    value={search.tab ?? "overview"}
                    onValueChange={(value) => {
                        void navigate({
                            to: "/$workspaceId/nodes/$nodeId",
                            params: { workspaceId, nodeId },
                            search: {
                                tab: value as "overview" | "activity" | "settings",
                            },
                            replace: true,
                        });
                    }}
                    className="flex min-h-0 flex-1 flex-col py-2"
                >
                    <div className="shrink-0 px-4 sm:px-6">
                        <TabsList className="w-fit">
                            <TabsTrigger
                                value="overview"
                                className="flex-none px-3.5 text-sm"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="activity"
                                className="flex-none px-3.5 text-sm"
                            >
                                Activity
                            </TabsTrigger>
                            <TabsTrigger
                                value="settings"
                                className="flex-none px-3.5 text-sm"
                            >
                                Settings
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent
                        value="overview"
                        className="min-h-0 overflow-y-auto pt-6"
                    >
                        <OverviewConsole node={node} />
                    </TabsContent>

                    <TabsContent
                        value="activity"
                        className="flex min-h-0 flex-1 flex-col pt-6"
                    >
                        <ActivityTimeline items={activity} />
                    </TabsContent>

                    <TabsContent
                        value="settings"
                        className="min-h-0 overflow-y-auto pt-6"
                    >
                        <NodeSettingsPanel
                            node={node}
                            generatedToken={generatedToken}
                            isGeneratingToken={generateTokenMutation.isPending}
                            onDismissToken={() => setGeneratedToken(null)}
                            onGenerateToken={async () => {
                                const result = await generateTokenMutation.mutateAsync({
                                    workspaceId,
                                    nodeId,
                                });
                                setGeneratedToken(result.token);
                                await Promise.all([
                                    queryClient.invalidateQueries({
                                        queryKey: nodesApi.detail.getKey({
                                            workspaceId,
                                            nodeId,
                                        }),
                                    }),
                                    queryClient.invalidateQueries({
                                        queryKey: nodesApi.list.getKey({
                                            workspaceId,
                                        }),
                                    }),
                                ]);
                            }}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </section>
    );
}

function StatusPill({
    value,
    tone,
}: {
    value: string;
    tone: "online" | "offline" | "unknown" | "healthy" | "degraded" | "error";
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium capitalize",
                getStatusPillClassName(tone)
            )}
        >
            {value}
        </span>
    );
}

function getStatusPillClassName(
    value: "online" | "offline" | "unknown" | "healthy" | "degraded" | "error"
) {
    switch (value) {
        case "online":
        case "healthy":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "degraded":
            return "border-orange-200 bg-orange-50 text-orange-700";
        case "error":
            return "border-red-200 bg-red-50 text-red-700";
        default:
            return "border-border bg-muted text-muted-foreground";
    }
}
