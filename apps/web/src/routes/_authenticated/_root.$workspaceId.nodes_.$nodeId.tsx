import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PencilEdit02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { ActivityTimeline } from "@/features/nodes/activity-feed-preview";
import { OverviewConsole, ProfilesTable } from "@/features/nodes/node-detail-previews";
import {
    getWorkspaceNodes,
    getWorkspaceNode,
    getWorkspaceNodeDetail,
    nodeStatusLabels,
    saveWorkspaceNodeDetail,
    updateWorkspaceNode,
} from "@/features/nodes/mock-data";
import type {
    NodeActivityItem,
    NodeProfile,
    NodeStatus,
    WorkspaceNode,
    WorkspaceNodeDetail,
} from "@/features/nodes/types";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute(
    "/_authenticated/_root/$workspaceId/nodes_/$nodeId"
)({
    component: RouteComponent,
});

function RouteComponent() {
    const { workspaceId, nodeId } = Route.useParams();
    const initialNode = useMemo(() => getWorkspaceNode(nodeId), [nodeId]);
    const initialDetail = useMemo(() => getWorkspaceNodeDetail(nodeId), [nodeId]);
    const [node, setNode] = useState<WorkspaceNode | undefined>(initialNode);
    const [detail, setDetail] = useState<WorkspaceNodeDetail | undefined>(
        initialDetail
    );
    const [nameDraft, setNameDraft] = useState(initialNode?.name ?? "");
    const [isEditingName, setIsEditingName] = useState(false);
    const [isAddingLabel, setIsAddingLabel] = useState(false);
    const [labelSearchValue, setLabelSearchValue] = useState("");
    const [profileDraft, setProfileDraft] = useState(() =>
        getDefaultProfileDraft(initialNode)
    );
    const [isProfileSheetOpen, setIsProfileSheetOpen] = useState(false);
    const availableLabels = useMemo(
        () =>
            Array.from(
                new Set(getWorkspaceNodes().flatMap((entry) => entry.labels))
            ).sort((left, right) => left.localeCompare(right)),
        []
    );
    const filteredLabelOptions = useMemo(() => {
        const normalizedQuery = labelSearchValue.trim().toLowerCase();
        const assignedLabels = node?.labels ?? [];

        return availableLabels.filter((label) => {
            if (assignedLabels.includes(label)) {
                return false;
            }

            return normalizedQuery
                ? label.toLowerCase().includes(normalizedQuery)
                : true;
        });
    }, [availableLabels, labelSearchValue, node?.labels]);

    if (!node || !detail) {
        return (
            <section className="bg-background flex h-full min-h-0 min-w-0 flex-col">
                <div className="px-4 py-6 sm:px-6">
                    <p className="text-foreground text-sm font-medium">
                        Node not found.
                    </p>
                    <p className="text-muted-foreground mt-2 text-sm">
                        The requested node could not be found in this workspace.
                    </p>
                    <div className="mt-4">
                        <Button asChild variant="outline">
                            <Link to="/$workspaceId/nodes" params={{ workspaceId }}>
                                Back to nodes
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        );
    }

    const currentNode = node;
    const currentDetail = detail;

    function commitNodeUpdate(updates: Partial<WorkspaceNode>) {
        const nextNode = updateWorkspaceNode(currentNode.id, updates);

        if (nextNode) {
            setNode(nextNode);
        }

        return nextNode;
    }

    function commitDetailUpdate(nextDetail: WorkspaceNodeDetail) {
        const savedDetail = saveWorkspaceNodeDetail(nextDetail);
        setDetail(savedDetail);
        return savedDetail;
    }

    function addLabel(label: string) {
        const nextLabel = label.trim();

        if (!nextLabel || currentNode.labels.includes(nextLabel)) {
            return;
        }

        commitNodeUpdate({
            labels: [...currentNode.labels, nextLabel],
        });
        commitDetailUpdate({
            ...currentDetail,
            activityFeed: [
                createActivityItem(
                    "Label added",
                    `Added ${nextLabel} label to the node.`
                ),
                ...currentDetail.activityFeed,
            ],
        });
        setLabelSearchValue("");
        setIsAddingLabel(false);
    }

    function removeLabel(label: string) {
        commitNodeUpdate({
            labels: currentNode.labels.filter((entry) => entry !== label),
        });
        commitDetailUpdate({
            ...currentDetail,
            activityFeed: [
                createActivityItem(
                    "Label removed",
                    `Removed ${label} label from the node.`
                ),
                ...currentDetail.activityFeed,
            ],
        });
    }

    function saveName() {
        const nextName = nameDraft.trim();

        if (!nextName || nextName === currentNode.name) {
            setNameDraft(currentNode.name);
            setIsEditingName(false);
            return;
        }

        commitNodeUpdate({ name: nextName });
        commitDetailUpdate({
            ...currentDetail,
            activityFeed: [
                createActivityItem("Name updated", `Renamed node to ${nextName}.`),
                ...currentDetail.activityFeed,
            ],
        });
        setIsEditingName(false);
    }

    function toggleEnabled() {
        const nextEnabled = !currentDetail.isEnabled;

        commitNodeUpdate({
            lastHeartbeat: nextEnabled ? "moments ago" : "Disabled",
        });
        commitDetailUpdate({
            ...currentDetail,
            isEnabled: nextEnabled,
            activeProfileId:
                currentDetail.activeProfileId ?? currentDetail.profiles[0]?.id ?? null,
            activityFeed: [
                createActivityItem(
                    nextEnabled ? "Node enabled" : "Node disabled",
                    nextEnabled
                        ? "Node was re-enabled and is ready to receive work."
                        : "Node was disabled and taken out of scheduling."
                ),
                ...currentDetail.activityFeed,
            ],
        });
    }

    function addProfile() {
        const gpuModel = profileDraft.gpuModel.trim();
        const cpuCores = Number(profileDraft.cpuCores);
        const memoryGb = Number(profileDraft.memoryGb);

        if (
            !gpuModel ||
            !Number.isFinite(cpuCores) ||
            !Number.isFinite(memoryGb) ||
            cpuCores < 1 ||
            memoryGb < 1
        ) {
            return;
        }

        const nextProfile: NodeProfile = {
            id: crypto.randomUUID(),
            gpuModel,
            gpuCount: 1,
            cpuCores,
            memoryGb,
        };

        commitDetailUpdate({
            ...currentDetail,
            profiles: [nextProfile, ...currentDetail.profiles],
            activityFeed: [
                createActivityItem(
                    "Profile created",
                    `Added ${gpuModel} / ${cpuCores} CPU / ${memoryGb} GB RAM profile.`
                ),
                ...currentDetail.activityFeed,
            ],
        });
        setProfileDraft(getDefaultProfileDraft(currentNode));
        setIsProfileSheetOpen(false);
    }

    function cancelNameEdit() {
        setNameDraft(currentNode.name);
        setIsEditingName(false);
    }

    return (
        <section className="bg-background flex h-full min-h-0 min-w-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="px-4 py-5 sm:px-6">
                    <div className="flex flex-col gap-4 pb-5">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                            <Link
                                to="/$workspaceId/nodes"
                                params={{ workspaceId }}
                                className="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
                            >
                                Nodes
                            </Link>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-foreground font-medium">
                                {currentNode.name}
                            </span>
                        </div>

                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    {isEditingName ? (
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Input
                                                value={nameDraft}
                                                autoFocus
                                                className="h-9 min-w-[240px] text-xl font-semibold md:text-xl"
                                                onChange={(event) =>
                                                    setNameDraft(event.target.value)
                                                }
                                                onKeyDown={(event) => {
                                                    if (event.key === "Enter") {
                                                        event.preventDefault();
                                                        saveName();
                                                    }

                                                    if (event.key === "Escape") {
                                                        event.preventDefault();
                                                        cancelNameEdit();
                                                    }
                                                }}
                                            />
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="outline"
                                                onClick={saveName}
                                            >
                                                Save
                                            </Button>
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="ghost"
                                                onClick={cancelNameEdit}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                                                {currentNode.name}
                                            </h1>
                                            <Button
                                                type="button"
                                                size="icon-sm"
                                                variant="ghost"
                                                className="text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    setNameDraft(currentNode.name);
                                                    setIsEditingName(true);
                                                }}
                                            >
                                                <HugeiconsIcon
                                                    icon={PencilEdit02Icon}
                                                    strokeWidth={2}
                                                />
                                                <span className="sr-only">
                                                    Edit node name
                                                </span>
                                            </Button>
                                        </div>
                                    )}
                                    <StatusPill status={currentNode.status} />
                                    <span
                                        className={cn(
                                            "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
                                            currentDetail.isEnabled
                                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                                : "border-border bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {currentDetail.isEnabled
                                            ? "Enabled"
                                            : "Disabled"}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex flex-wrap items-start gap-2">
                                        {currentNode.labels.map((label) => (
                                            <button
                                                key={label}
                                                type="button"
                                                className="border-border bg-background text-muted-foreground hover:text-foreground inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs"
                                                onClick={() => removeLabel(label)}
                                            >
                                                <span>{label}</span>
                                                <span aria-hidden="true">x</span>
                                            </button>
                                        ))}
                                        <DropdownMenu
                                            open={isAddingLabel}
                                            onOpenChange={(open) => {
                                                setIsAddingLabel(open);

                                                if (!open) {
                                                    setLabelSearchValue("");
                                                }
                                            }}
                                        >
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    type="button"
                                                    size="icon-sm"
                                                    variant="outline"
                                                    className="mt-px size-6 rounded-md [&_svg:not([class*='size-'])]:size-3"
                                                >
                                                    <HugeiconsIcon
                                                        icon={PlusSignIcon}
                                                        strokeWidth={2}
                                                    />
                                                    <span className="sr-only">
                                                        Add label
                                                    </span>
                                                </Button>
                                            </DropdownMenuTrigger>

                                            <DropdownMenuContent
                                                align="start"
                                                sideOffset={6}
                                                className="w-72 p-2"
                                                onCloseAutoFocus={(event) =>
                                                    event.preventDefault()
                                                }
                                            >
                                                <div className="space-y-2">
                                                    <Input
                                                        value={labelSearchValue}
                                                        autoFocus
                                                        placeholder="Search labels"
                                                        className="h-8"
                                                        onChange={(event) =>
                                                            setLabelSearchValue(
                                                                event.target.value
                                                            )
                                                        }
                                                        onKeyDown={(event) => {
                                                            if (
                                                                event.key === "Enter" &&
                                                                filteredLabelOptions.length
                                                            ) {
                                                                event.preventDefault();
                                                                addLabel(
                                                                    filteredLabelOptions[0]
                                                                );
                                                            }

                                                            if (
                                                                event.key === "Escape"
                                                            ) {
                                                                event.preventDefault();
                                                                setIsAddingLabel(false);
                                                                setLabelSearchValue("");
                                                            }
                                                        }}
                                                    />

                                                    {filteredLabelOptions.length ? (
                                                        <div className="max-h-56 overflow-y-auto">
                                                            {filteredLabelOptions
                                                                .slice(0, 8)
                                                                .map((label) => (
                                                                    <DropdownMenuItem
                                                                        key={label}
                                                                        onSelect={() =>
                                                                            addLabel(
                                                                                label
                                                                            )
                                                                        }
                                                                    >
                                                                        {label}
                                                                    </DropdownMenuItem>
                                                                ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-muted-foreground px-2 py-1 text-sm">
                                                            No matching labels.
                                                        </p>
                                                    )}
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    {!currentNode.labels.length ? (
                                        <p className="text-muted-foreground text-sm">
                                            No labels assigned to this node.
                                        </p>
                                    ) : null}
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    variant={
                                        currentDetail.isEnabled ? "outline" : "default"
                                    }
                                    onClick={toggleEnabled}
                                >
                                    {currentDetail.isEnabled
                                        ? "Disable node"
                                        : "Enable node"}
                                </Button>
                            </div>
                        </div>
                    </div>

                    <Tabs defaultValue="overview" className="py-6">
                        <TabsList className="w-fit">
                            <TabsTrigger
                                value="overview"
                                className="flex-none px-3.5 text-sm"
                            >
                                Overview
                            </TabsTrigger>
                            <TabsTrigger
                                value="profiles"
                                className="flex-none px-3.5 text-sm"
                            >
                                Profiles
                            </TabsTrigger>
                            <TabsTrigger
                                value="activity"
                                className="flex-none px-3.5 text-sm"
                            >
                                Activity
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="overview" className="pt-6">
                            <OverviewConsole
                                node={currentNode}
                                detail={currentDetail}
                            />
                        </TabsContent>

                        <TabsContent value="profiles" className="pt-6">
                            <ProfilesTable
                                node={currentNode}
                                detail={currentDetail}
                                draft={profileDraft}
                                isSheetOpen={isProfileSheetOpen}
                                onDraftChange={(updater) => {
                                    if (typeof updater === "function") {
                                        setProfileDraft((current) => updater(current));
                                        return;
                                    }

                                    setProfileDraft((current) => ({
                                        ...current,
                                        ...updater,
                                    }));
                                }}
                                onOpenChange={(open) => {
                                    setIsProfileSheetOpen(open);

                                    if (open) {
                                        setProfileDraft(
                                            getDefaultProfileDraft(currentNode)
                                        );
                                    }
                                }}
                                onAddProfile={addProfile}
                            />
                        </TabsContent>

                        <TabsContent value="activity" className="pt-6">
                            <ActivityTimeline items={currentDetail.activityFeed} />
                        </TabsContent>
                    </Tabs>
                </div>
            </div>
        </section>
    );
}

function StatusPill({ status }: { status: NodeStatus }) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
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

function createActivityItem(title: string, description: string): NodeActivityItem {
    return {
        id: crypto.randomUUID(),
        occurredAt: new Date().toISOString(),
        title,
        description,
    };
}

function getDefaultProfileDraft(node: WorkspaceNode | undefined) {
    return {
        gpuModel: node?.gpuModel ?? "",
        cpuCores: "32",
        memoryGb: "128",
    };
}
