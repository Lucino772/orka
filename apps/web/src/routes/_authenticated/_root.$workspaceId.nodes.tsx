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
import { Link, createFileRoute } from "@tanstack/react-router";

import { AddNodeSheet } from "@/features/nodes/add-node-sheet";
import {
    getWorkspaceNodes,
    nodeStatusLabels,
    statusOptions,
    upsertWorkspaceNode,
} from "@/features/nodes/mock-data";
import type { NodeStatus, WorkspaceNode } from "@/features/nodes/types";
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
    component: RouteComponent,
});

type NodeStatusFilter = (typeof statusOptions)[number]["value"];

function RouteComponent() {
    const { workspaceId } = Route.useParams();
    const [nodes, setNodes] = useState<WorkspaceNode[]>(() => getWorkspaceNodes());
    const [searchValue, setSearchValue] = useState("");
    const [statusFilter, setStatusFilter] = useState<NodeStatusFilter>("all");
    const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
    const deferredSearchValue = useDeferredValue(searchValue);
    const normalizedSearch = deferredSearchValue.trim().toLowerCase();
    const summary = useMemo(() => getNodeSummary(nodes), [nodes]);
    const filteredNodes = useMemo(
        () => filterNodes(nodes, normalizedSearch, statusFilter),
        [nodes, normalizedSearch, statusFilter]
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
                                Manage mocked workspace nodes in a dense operational
                                table without touching the backend.
                            </p>
                        </div>
                    </div>

                    <SummaryStrip summary={summary} />

                    <div className="flex flex-col gap-3 px-4 py-4 sm:px-6">
                        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="flex w-full max-w-4xl flex-col gap-3 sm:flex-row sm:items-center">
                                <Input
                                    value={searchValue}
                                    placeholder="Search by node name, GPU model, or label"
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

                        <div className="flex flex-wrap gap-2">
                            {statusOptions.map((option) => {
                                const isActive = statusFilter === option.value;

                                return (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant={isActive ? "default" : "outline"}
                                        size="sm"
                                        className="rounded-md"
                                        onClick={() => setStatusFilter(option.value)}
                                    >
                                        {option.label}
                                    </Button>
                                );
                            })}

                            {(searchValue || statusFilter !== "all") && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setSearchValue("");
                                        setStatusFilter("all");
                                    }}
                                >
                                    Clear filters
                                </Button>
                            )}
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
                                    No nodes match the current filters.
                                </p>
                                <p className="text-muted-foreground mt-2 text-sm leading-6">
                                    Reset the search terms or status filter to return to
                                    the full mocked inventory.
                                </p>
                                <div className="mt-4 flex justify-center">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setSearchValue("");
                                            setStatusFilter("all");
                                        }}
                                    >
                                        Clear filters
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
                onCreateNode={(node) => {
                    upsertWorkspaceNode(node);
                    setNodes((currentNodes) => [node, ...currentNodes]);
                    setSearchValue("");
                    setStatusFilter("all");
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
            detail: `${summary.degradedNodes} degraded`,
        },
        {
            label: "GPUs",
            value: summary.totalGpus.toString(),
            detail: `${summary.totalMemoryGb.toLocaleString()} GB RAM`,
        },
        {
            label: "Avg utilization",
            value: `${summary.averageUtilization}%`,
            detail: `${summary.totalCpuCores.toLocaleString()} CPU cores`,
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
                        index === 1 && "xl:border-r",
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
    nodes: WorkspaceNode[];
    workspaceId: string;
}) {
    const columns = useMemo<ColumnDef<WorkspaceNode>[]>(
        () => [
            {
                id: "name",
                accessorKey: "name",
                size: 304,
                header: "Node",
                cell: ({ row }) => (
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
                ),
            },
            {
                id: "status",
                accessorKey: "status",
                size: 128,
                header: "Status",
                cell: ({ row }) => <StatusPill status={row.original.status} compact />,
            },
            {
                id: "gpuModel",
                size: 280,
                header: "GPUs",
                cell: ({ row }) =>
                    `${row.original.gpuCount} x ${row.original.gpuModel}`,
            },
            {
                id: "cpuCores",
                accessorKey: "cpuCores",
                size: 120,
                header: "CPU",
            },
            {
                id: "memoryGb",
                size: 128,
                header: "RAM",
                cell: ({ row }) => `${row.original.memoryGb} GB`,
            },
            {
                id: "labels",
                accessorKey: "labels",
                size: 260,
                header: "Labels",
                cell: ({ row }) => (
                    <div className="flex flex-wrap gap-1 whitespace-normal">
                        {row.original.labels.map((label) => (
                            <span
                                key={label}
                                className="border-border bg-muted/40 text-muted-foreground rounded border px-1.5 py-0.5 text-[11px]"
                            >
                                {label}
                            </span>
                        ))}
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

function DenseTableColGroup({ table }: { table: TanstackTable<WorkspaceNode> }) {
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
    status,
    compact = false,
}: {
    status: NodeStatus;
    compact?: boolean;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
                compact && "px-1.5 py-0.5 text-[11px]",
                getStatusPillClassName(status)
            )}
        >
            {nodeStatusLabels[status]}
        </span>
    );
}

function getStatusPillClassName(status: NodeStatus) {
    switch (status) {
        case "online":
            return "border-emerald-200 bg-emerald-50 text-emerald-700";
        case "degraded":
            return "border-orange-200 bg-orange-50 text-orange-700";
        case "offline":
            return "border-border bg-muted text-muted-foreground";
        default:
            return "border-border bg-background text-foreground";
    }
}

function filterNodes(
    nodes: WorkspaceNode[],
    searchValue: string,
    statusFilter: NodeStatusFilter
) {
    return nodes.filter((node) => {
        const matchesStatus =
            statusFilter === "all" ? true : node.status === statusFilter;

        if (!matchesStatus) {
            return false;
        }

        if (!searchValue) {
            return true;
        }

        const haystack = [node.name, node.gpuModel, ...node.labels]
            .join(" ")
            .toLowerCase();

        return haystack.includes(searchValue);
    });
}

function getNodeSummary(nodes: WorkspaceNode[]) {
    const totalNodes = nodes.length;
    const onlineNodes = nodes.filter((node) => node.status === "online").length;
    const degradedNodes = nodes.filter((node) => node.status === "degraded").length;
    const totalGpus = nodes.reduce((sum, node) => sum + node.gpuCount, 0);
    const totalMemoryGb = nodes.reduce((sum, node) => sum + node.memoryGb, 0);
    const totalCpuCores = nodes.reduce((sum, node) => sum + node.cpuCores, 0);
    const averageUtilization =
        totalNodes > 0
            ? Math.round(
                  nodes.reduce((sum, node) => sum + node.utilizationPct, 0) / totalNodes
              )
            : 0;

    return {
        totalNodes,
        degradedNodes,
        onlineNodes,
        totalGpus,
        totalMemoryGb,
        totalCpuCores,
        averageUtilization,
    };
}
