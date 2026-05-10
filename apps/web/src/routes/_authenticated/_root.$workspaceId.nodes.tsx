import { useDeferredValue, useMemo, useState } from "react";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
    type Table as TanstackTable,
} from "@tanstack/react-table";
import { PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";

import { nodesApi, type NodeSummary } from "@/api/nodes";
import { AddNodeSheet } from "@/features/nodes/add-node-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/_root/$workspaceId/nodes")({
    async loader({ context, params }) {
        await context.queryClient.ensureQueryData(
            nodesApi.list.getFetchOptions({ workspaceId: params.workspaceId })
        );
    },
    component: RouteComponent,
});

function RouteComponent() {
    const { workspaceId } = Route.useParams();
    const navigate = Route.useNavigate();
    const queryClient = useQueryClient();
    const [searchValue, setSearchValue] = useState("");
    const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
    const deferredSearchValue = useDeferredValue(searchValue);
    const normalizedSearch = deferredSearchValue.trim().toLowerCase();
    const { data: nodes } = nodesApi.list.useSuspenseQuery({
        variables: { workspaceId },
        refetchInterval: 3000,
    });
    const createNodeMutation = nodesApi.create.useMutation({
        async onSuccess(node) {
            await queryClient.invalidateQueries({
                queryKey: nodesApi.list.getKey({ workspaceId }),
            });
            await navigate({
                to: "/$workspaceId/nodes/$nodeId",
                params: {
                    workspaceId,
                    nodeId: node.id,
                },
                search: {
                    tab: "settings",
                },
            });
        },
    });
    const summary = useMemo(() => getNodeSummary(nodes), [nodes]);
    const filteredNodes = useMemo(
        () => filterNodes(nodes, normalizedSearch),
        [nodes, normalizedSearch]
    );

    return (
        <section className="bg-background flex h-full min-h-0 min-w-0 flex-col">
            <div className="flex h-full w-full min-w-0 flex-col overflow-hidden">
                <header className="border-border border-b">
                    <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
                        <div className="space-y-2">
                            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                                Nodes
                            </h1>
                            <p className="text-muted-foreground max-w-3xl text-sm leading-6">
                                Manage node connectivity and inspect the latest metadata
                                reported by each agent.
                            </p>
                        </div>
                    </div>

                    <SummaryStrip summary={summary} />

                    <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
                                <Input
                                    value={searchValue}
                                    placeholder="Search by node name, hostname, agent, or OS"
                                    className="h-10 min-w-0 flex-1 px-3 text-sm md:text-sm"
                                    onChange={(event) =>
                                        setSearchValue(event.target.value)
                                    }
                                />

                                <Button
                                    size="lg"
                                    className="h-10 shrink-0 px-4"
                                    onClick={() => setIsAddNodeOpen(true)}
                                >
                                    <HugeiconsIcon
                                        icon={PlusSignIcon}
                                        strokeWidth={2}
                                    />
                                    Add node
                                </Button>
                            </div>

                            <div className="text-muted-foreground text-sm">
                                {filteredNodes.length} of {nodes.length} nodes visible
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    {filteredNodes.length ? (
                        <DenseTable nodes={filteredNodes} workspaceId={workspaceId} />
                    ) : (
                        <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-12 text-center sm:px-6">
                            <div>
                                <p className="text-foreground text-sm font-medium">
                                    No nodes match the current search.
                                </p>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">
                                    Clear the search term to return to the full node
                                    inventory.
                                </p>
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setSearchValue("")}
                                    >
                                        Clear search
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AddNodeSheet
                open={isAddNodeOpen}
                onOpenChange={setIsAddNodeOpen}
                onCreateNode={async (node) => {
                    await createNodeMutation.mutateAsync({
                        workspaceId,
                        data: node,
                    });
                }}
            />
        </section>
    );
}

function SummaryStrip({ summary }: { summary: ReturnType<typeof getNodeSummary> }) {
    const items = [
        {
            label: "Total nodes",
            value: summary.totalNodes.toString(),
            detail: `${summary.onlineNodes} online`,
        },
        {
            label: "Online",
            value: summary.onlineNodes.toString(),
            detail: `${summary.offlineNodes} offline`,
        },
        {
            label: "Healthy",
            value: summary.healthyNodes.toString(),
            detail: `${summary.degradedNodes} degraded`,
        },
        {
            label: "GPUs",
            value: summary.totalGpus.toString(),
            detail: `${formatBytes(summary.totalRamBytes)} RAM`,
        },
    ];

    return (
        <div className="border-border grid border-t border-b sm:grid-cols-2 xl:grid-cols-4">
            {items.map((item, index) => (
                <div
                    key={item.label}
                    className={cn(
                        "px-4 py-3",
                        index !== items.length - 1 &&
                            "border-border border-b xl:border-r xl:border-b-0",
                        index === 0 && "sm:border-r xl:border-r",
                        index === 2 && "sm:border-r xl:border-r"
                    )}
                >
                    <div className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                        {item.label}
                    </div>
                    <div className="text-foreground mt-1 text-2xl font-semibold tracking-tight">
                        {item.value}
                    </div>
                    <div className="text-muted-foreground mt-1 text-sm">
                        {item.detail}
                    </div>
                </div>
            ))}
        </div>
    );
}

function DenseTable({
    nodes,
    workspaceId,
}: {
    nodes: NodeSummary[];
    workspaceId: string;
}) {
    const columns = useMemo<ColumnDef<NodeSummary>[]>(
        () => [
            {
                id: "name",
                accessorKey: "name",
                size: 300,
                header: "Node",
                cell: ({ row }) => (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <StatusDot status={row.original.status} />
                            <Link
                                to="/$workspaceId/nodes/$nodeId"
                                params={{
                                    workspaceId,
                                    nodeId: row.original.id,
                                }}
                                className="text-foreground font-medium underline-offset-4 hover:underline"
                            >
                                {row.original.name}
                            </Link>
                        </div>
                        <div className="text-muted-foreground pl-[1.125rem] text-xs">
                            {row.original.hostname ?? "—"}
                        </div>
                    </div>
                ),
            },
            {
                id: "health",
                accessorKey: "health",
                size: 140,
                header: "Health",
                cell: ({ row }) => (
                    <StatusPill
                        value={row.original.health}
                        tone={row.original.health}
                    />
                ),
            },
            {
                id: "gpus",
                size: 260,
                header: "GPUs",
                cell: ({ row }) => (
                    <div className="text-foreground">
                        {formatGpuSummary(row.original)}
                    </div>
                ),
            },
            {
                id: "cpu",
                size: 110,
                header: "CPU",
                cell: ({ row }) => (
                    <div className="text-foreground">
                        {row.original.cpu_core_count ?? "—"}
                    </div>
                ),
            },
            {
                id: "ram",
                size: 120,
                header: "RAM",
                cell: ({ row }) => (
                    <div className="text-foreground">
                        {formatBytes(row.original.ram_bytes)}
                    </div>
                ),
            },
            {
                id: "agent",
                size: 170,
                header: "Agent",
                cell: ({ row }) => (
                    <div className="text-foreground">
                        {row.original.agent_version ?? "—"}
                    </div>
                ),
            },
            {
                id: "os",
                size: 180,
                header: "OS",
                cell: ({ row }) => (
                    <div className="text-foreground">
                        {joinParts(
                            row.original.os_name ?? null,
                            row.original.os_version ?? null
                        )}
                    </div>
                ),
            },
        ],
        [workspaceId]
    );
    // TanStack Table exposes non-memoizable functions; keep the warning scoped here.
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: nodes,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div className="flex min-h-0 w-full flex-col">
                <table className="w-full table-fixed text-xs">
                    <DenseTableColGroup table={table} />
                    <TableHeader className="border-border bg-background border-b">
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow
                                key={headerGroup.id}
                                className="hover:bg-transparent"
                            >
                                {headerGroup.headers.map((header) => (
                                    <TableHead
                                        key={header.id}
                                        className="h-10 py-2 text-[0.7rem] tracking-[0.16em] whitespace-normal uppercase"
                                    >
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                </table>

                <div className="min-h-0 flex-1 overflow-y-auto">
                    <table className="w-full table-fixed text-xs">
                        <DenseTableColGroup table={table} />
                        <TableBody>
                            {table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} className="hover:bg-muted/15">
                                    {row.getVisibleCells().map((cell) => (
                                        <TableCell
                                            key={cell.id}
                                            className="py-2 text-xs break-words whitespace-normal"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function DenseTableColGroup({ table }: { table: TanstackTable<NodeSummary> }) {
    return (
        <colgroup>
            {table.getAllLeafColumns().map((column) => {
                const widthPercent = (column.getSize() / table.getTotalSize()) * 100;

                return <col key={column.id} style={{ width: `${widthPercent}%` }} />;
            })}
        </colgroup>
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

function StatusDot({ status }: { status: "online" | "offline" }) {
    return (
        <div className="flex items-center">
            <span
                className={cn(
                    "inline-block size-2.5 rounded-full",
                    status === "online" ? "bg-emerald-500" : "bg-slate-300"
                )}
                aria-label={status}
                title={status}
            />
        </div>
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

function filterNodes(nodes: NodeSummary[], searchValue: string) {
    return nodes.filter((node) => {
        if (!searchValue) {
            return true;
        }

        const haystack = [
            node.name,
            node.hostname ?? "",
            node.agent_version ?? "",
            node.os_name ?? "",
            node.os_version ?? "",
            node.gpu_model ?? "",
        ]
            .join(" ")
            .toLowerCase();

        return haystack.includes(searchValue);
    });
}

function joinParts(...parts: Array<string | null | undefined>) {
    const filtered = parts.filter(Boolean);
    return filtered.length ? filtered.join(" ") : "—";
}

function getNodeSummary(nodes: NodeSummary[]) {
    return {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter((node) => node.status === "online").length,
        offlineNodes: nodes.filter((node) => node.status === "offline").length,
        healthyNodes: nodes.filter((node) => node.health === "healthy").length,
        degradedNodes: nodes.filter((node) => node.health === "degraded").length,
        totalGpus: nodes.reduce((sum, node) => sum + (node.gpu_count ?? 0), 0),
        totalRamBytes: nodes.reduce((sum, node) => sum + (node.ram_bytes ?? 0), 0),
    };
}

function formatGpuSummary(node: NodeSummary) {
    const count = node.gpu_count ?? 0;
    const model = node.gpu_model ?? "—";
    if (count <= 0) {
        return "—";
    }
    return `${count} x ${model}`;
}

function formatBytes(value: number | null | undefined) {
    if (value == null) {
        return "—";
    }
    const gb = value / 1024 ** 3;
    if (gb >= 1) {
        return `${Math.round(gb)} GB`;
    }
    const mb = value / 1024 ** 2;
    return `${Math.round(mb)} MB`;
}
