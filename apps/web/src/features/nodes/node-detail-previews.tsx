import {
    Activity01Icon,
    ChartBarLineIcon,
    ComputerSettingsIcon,
    DatabaseSyncIcon,
    PlusSignIcon,
    ServerStack01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { nodeStatusLabels } from "@/features/nodes/mock-data";
import type { WorkspaceNode, WorkspaceNodeDetail } from "@/features/nodes/types";
import { cn } from "@/lib/utils";

interface OverviewConsoleProps {
    node: WorkspaceNode;
    detail: WorkspaceNodeDetail;
}

interface ProfilesTableProps {
    node: WorkspaceNode;
    detail: WorkspaceNodeDetail;
    draft: {
        gpuModel: string;
        cpuCores: string;
        memoryGb: string;
    };
    isSheetOpen: boolean;
    onDraftChange: (
        updater:
            | Partial<ProfilesTableProps["draft"]>
            | ((current: ProfilesTableProps["draft"]) => ProfilesTableProps["draft"])
    ) => void;
    onOpenChange: (open: boolean) => void;
    onAddProfile: () => void;
}

export function OverviewConsole({ node, detail }: OverviewConsoleProps) {
    const heartbeat = getHeartbeatSummary(detail, node.lastHeartbeat);
    const rows = [
        ["Scheduling", detail.isEnabled ? "Enabled" : "Disabled"],
        ["Status", nodeStatusLabels[node.status]],
        ["Utilization", `${node.utilizationPct}%`],
        ["Heartbeat", heartbeat],
        ["Provider", node.provider],
        ["Pool", node.pool],
        ["Region", node.region],
        ["Agent", detail.agentVersion],
        ["OS", detail.systemInfo.os],
        ["Kernel", detail.systemInfo.kernel],
        ["CPU", detail.systemInfo.cpuModel],
        ["Architecture", detail.systemInfo.cpuArchitecture],
        ["CPU total", `${detail.systemInfo.totalCpuCores} cores`],
        ["RAM total", `${detail.systemInfo.totalRamGb} GB`],
        ["Runtime", detail.systemInfo.containerRuntime],
        ["Uptime", detail.systemInfo.uptime],
    ] as const;

    return (
        <div className="space-y-6">
            <div className="grid gap-3 lg:grid-cols-4">
                <FlatMetricTile
                    icon={Activity01Icon}
                    label="Utilization"
                    value={`${node.utilizationPct}%`}
                    accent={node.utilizationPct > 80 ? "warning" : "neutral"}
                />
                <FlatMetricTile
                    icon={ServerStack01Icon}
                    label="Scheduling"
                    value={detail.isEnabled ? "Enabled" : "Disabled"}
                    accent={detail.isEnabled ? "positive" : "neutral"}
                />
                <FlatMetricTile
                    icon={ChartBarLineIcon}
                    label="Status"
                    value={nodeStatusLabels[node.status]}
                    accent={getStatusAccent(node.status)}
                />
                <FlatMetricTile
                    icon={DatabaseSyncIcon}
                    label="Heartbeat"
                    value={node.lastHeartbeat}
                />
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <HugeiconsIcon
                            icon={ServerStack01Icon}
                            className="text-slate-500"
                            strokeWidth={1.8}
                        />
                        <h2 className="text-foreground text-sm font-semibold">
                            Control state
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-200/80 border-y border-slate-200/80">
                        {rows.slice(0, 8).map(([label, value]) => (
                            <ConsoleRow key={label} label={label} value={value} />
                        ))}
                    </div>
                </section>

                <section className="space-y-4">
                    <div className="flex items-center gap-2">
                        <HugeiconsIcon
                            icon={ComputerSettingsIcon}
                            className="text-slate-500"
                            strokeWidth={1.8}
                        />
                        <h2 className="text-foreground text-sm font-semibold">
                            System information
                        </h2>
                    </div>

                    <div className="divide-y divide-slate-200/80 border-y border-slate-200/80">
                        {rows.slice(8).map(([label, value]) => (
                            <ConsoleRow key={label} label={label} value={value} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export function ProfilesTable({
    node,
    detail,
    draft,
    isSheetOpen,
    onDraftChange,
    onOpenChange,
    onAddProfile,
}: ProfilesTableProps) {
    const activeProfileId = detail.isEnabled ? detail.activeProfileId : null;

    return (
        <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <h2 className="text-foreground text-sm font-semibold">Profiles</h2>
                <Button type="button" onClick={() => onOpenChange(true)}>
                    <HugeiconsIcon icon={PlusSignIcon} strokeWidth={1.8} />
                    Add profile
                </Button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full table-fixed text-sm">
                    <TableHeader className="border-b border-slate-200">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-mono text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                                GPU
                            </TableHead>
                            <TableHead className="font-mono text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                                CPU
                            </TableHead>
                            <TableHead className="font-mono text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                                RAM
                            </TableHead>
                            <TableHead className="font-mono text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                                Usage
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {detail.profiles.map((profile) => {
                            const inUse = profile.id === activeProfileId;

                            return (
                                <TableRow
                                    key={profile.id}
                                    className="hover:bg-slate-50/50"
                                >
                                    <TableCell className="whitespace-normal">
                                        <div className="space-y-1">
                                            <div className="text-foreground font-medium">
                                                {profile.gpuModel}
                                            </div>
                                            {profile.gpuModel !== node.gpuModel ? (
                                                <div className="text-muted-foreground text-xs">
                                                    Host GPU: {node.gpuModel}
                                                </div>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                    <TableCell>{profile.cpuCores} cores</TableCell>
                                    <TableCell>{profile.memoryGb} GB</TableCell>
                                    <TableCell>
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                                                inUse
                                                    ? "bg-emerald-50 text-emerald-700"
                                                    : "bg-slate-100 text-slate-600"
                                            )}
                                        >
                                            {inUse ? "In use" : "Idle"}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </table>
            </div>

            <Sheet open={isSheetOpen} onOpenChange={onOpenChange}>
                <SheetContent side="right" className="sm:max-w-md">
                    <SheetHeader>
                        <SheetTitle>Add profile</SheetTitle>
                    </SheetHeader>

                    <div className="space-y-4 px-6">
                        <div className="space-y-2">
                            <label className="text-foreground text-xs font-medium tracking-[0.18em] uppercase">
                                GPU
                            </label>
                            <Input
                                value={draft.gpuModel}
                                placeholder="GPU model"
                                onChange={(event) =>
                                    onDraftChange((current) => ({
                                        ...current,
                                        gpuModel: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-foreground text-xs font-medium tracking-[0.18em] uppercase">
                                CPU cores
                            </label>
                            <Input
                                value={draft.cpuCores}
                                type="number"
                                min={1}
                                placeholder="CPU cores"
                                onChange={(event) =>
                                    onDraftChange((current) => ({
                                        ...current,
                                        cpuCores: event.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-foreground text-xs font-medium tracking-[0.18em] uppercase">
                                RAM
                            </label>
                            <Input
                                value={draft.memoryGb}
                                type="number"
                                min={1}
                                placeholder="RAM (GB)"
                                onChange={(event) =>
                                    onDraftChange((current) => ({
                                        ...current,
                                        memoryGb: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <SheetFooter>
                        <Button type="button" onClick={onAddProfile}>
                            Create profile
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    );
}

function FlatMetricTile({
    icon,
    label,
    value,
    accent = "neutral",
}: {
    icon: IconSvgElement;
    label: string;
    value: string;
    accent?: "neutral" | "positive" | "warning";
}) {
    return (
        <div className="border-b border-slate-200 pb-4">
            <div className="flex items-center gap-2">
                <HugeiconsIcon
                    icon={icon}
                    className={cn(
                        "size-4",
                        accent === "positive"
                            ? "text-emerald-600"
                            : accent === "warning"
                              ? "text-orange-600"
                              : "text-slate-500"
                    )}
                    strokeWidth={1.8}
                />
                <span className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                    {label}
                </span>
            </div>
            <p className="text-foreground mt-3 text-lg font-semibold tracking-tight">
                {value}
            </p>
        </div>
    );
}

function ConsoleRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="grid gap-2 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
            <div className="font-mono text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                {label}
            </div>
            <div className="text-foreground text-sm">{value}</div>
        </div>
    );
}

function getStatusAccent(status: WorkspaceNode["status"]) {
    switch (status) {
        case "online":
            return "positive" as const;
        case "degraded":
            return "warning" as const;
        default:
            return "neutral" as const;
    }
}

function getHeartbeatSummary(detail: WorkspaceNodeDetail, fallback: string) {
    if (!detail.isEnabled) {
        return "Disabled";
    }

    const latestHeartbeat = detail.activityFeed.find(
        (item) => item.title.toLowerCase() === "agent heartbeat received"
    );

    if (!latestHeartbeat) {
        return fallback;
    }

    const heartbeatDate = new Date(latestHeartbeat.occurredAt);

    if (Number.isNaN(heartbeatDate.getTime())) {
        return fallback;
    }

    return formatRelativeTime(heartbeatDate);
}

function formatRelativeTime(date: Date) {
    const diffMs = date.getTime() - Date.now();
    const future = diffMs > 0;
    const absoluteMinutes = Math.max(0, Math.floor(Math.abs(diffMs) / 60000));

    if (absoluteMinutes < 1) {
        return "just now";
    }

    if (absoluteMinutes < 60) {
        return formatRelativeUnit(absoluteMinutes, "minute", future);
    }

    const absoluteHours = Math.floor(absoluteMinutes / 60);

    if (absoluteHours < 24) {
        return formatRelativeUnit(absoluteHours, "hour", future);
    }

    const absoluteDays = Math.floor(absoluteHours / 24);

    if (absoluteDays < 7) {
        return formatRelativeUnit(absoluteDays, "day", future);
    }

    const absoluteWeeks = Math.floor(absoluteDays / 7);
    return formatRelativeUnit(absoluteWeeks, "week", future);
}

function formatRelativeUnit(
    value: number,
    unit: "minute" | "hour" | "day" | "week",
    future: boolean
) {
    const label = `${value} ${unit}${value === 1 ? "" : "s"}`;
    return future ? `in ${label}` : `${label} ago`;
}
