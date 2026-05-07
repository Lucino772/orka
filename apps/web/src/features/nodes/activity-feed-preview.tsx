import {
    AlertCircleIcon,
    CheckmarkCircle02Icon,
    CpuSettingsIcon,
    Edit02Icon,
    FileEditIcon,
    LabelIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";

import type { NodeActivityItem } from "@/features/nodes/types";
import { cn } from "@/lib/utils";

type ActivityTone = "positive" | "warning" | "neutral";
type ActivityKind =
    | "profile"
    | "health"
    | "scheduling"
    | "labels"
    | "inventory"
    | "generic";

interface ActivityEntry {
    id: string;
    kind: ActivityKind;
    tone: ActivityTone;
    title: string;
    details: string;
    absoluteTimeLabel: string;
    relativeTimeLabel: string;
    dateLabel: string;
    occurredAtMs: number;
}

interface ActivityMetadata {
    kind: ActivityKind;
    tone: ActivityTone;
    title: string;
    details: string;
}

interface ActivityTimelineProps {
    items: NodeActivityItem[];
}

export function ActivityTimeline({ items }: ActivityTimelineProps) {
    const entries = items.map(mapActivityEntry);
    const groups = groupEntriesByDate(entries);

    if (!entries.length) {
        return (
            <div className="py-10 text-center">
                <p className="text-foreground text-sm font-medium">No activity yet</p>
                <p className="text-muted-foreground mt-2 text-sm">
                    New operational events will appear here as the node changes.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-7">
            {groups.map((group) => (
                <TimelineGroup key={group.dateLabel} group={group} />
            ))}
        </div>
    );
}

function TimelineGroup({
    group,
}: {
    group: { dateLabel: string; entries: ActivityEntry[] };
}) {
    return (
        <section className="relative">
            <span className="bg-border absolute top-2 bottom-5 left-[0.96875rem] w-px" />

            <div className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4">
                <div className="flex justify-center">
                    <span className="border-border bg-background relative z-10 mt-1 size-2.5 rounded-full border" />
                </div>

                <div className="text-foreground/90 pt-0.5 text-[11px] font-semibold tracking-[0.24em] uppercase">
                    {group.dateLabel}
                </div>
            </div>

            <div className="mt-4 space-y-4">
                {group.entries.map((entry) => (
                    <TimelineItem key={entry.id} entry={entry} />
                ))}
            </div>
        </section>
    );
}

function TimelineItem({ entry }: { entry: ActivityEntry }) {
    return (
        <article className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4">
            <div className="flex justify-center">
                <span
                    className={cn(
                        "bg-background relative z-10 mt-0.5 flex size-8 items-center justify-center rounded-full border shadow-[0_0_0_4px_var(--background)]",
                        getIconChipClassName(entry.tone)
                    )}
                >
                    <HugeiconsIcon
                        icon={getActivityIcon(entry.kind, entry.tone)}
                        className="size-4"
                        strokeWidth={1.8}
                    />
                </span>
            </div>

            <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="text-foreground text-sm font-medium">
                        {entry.title}
                    </h3>
                    <span className="text-muted-foreground text-xs">
                        {entry.absoluteTimeLabel}
                    </span>
                    <span className="text-muted-foreground text-xs">
                        {entry.relativeTimeLabel}
                    </span>
                </div>

                <div className="mt-2">
                    <div className="border-border bg-background inline-flex max-w-full rounded-md border px-3 py-2">
                        <p className="text-foreground text-sm">{entry.details}</p>
                    </div>
                </div>
            </div>
        </article>
    );
}

function mapActivityEntry(item: NodeActivityItem): ActivityEntry {
    const metadata = inferActivityMetadata(item);
    const occurredAt = parseOccurredAt(item.occurredAt);

    return {
        id: item.id,
        kind: metadata.kind,
        tone: metadata.tone,
        title: metadata.title,
        details: metadata.details,
        absoluteTimeLabel: occurredAt ? formatAbsoluteTime(occurredAt) : "Unknown time",
        relativeTimeLabel: occurredAt ? formatRelativeTime(occurredAt) : "unknown time",
        dateLabel: occurredAt ? formatDateLabel(occurredAt) : "Unknown date",
        occurredAtMs: occurredAt?.getTime() ?? Number.NEGATIVE_INFINITY,
    };
}

function inferActivityMetadata(item: NodeActivityItem): ActivityMetadata {
    const normalizedTitle = item.title.trim().toLowerCase();
    const description = item.description.trim();
    const normalizedDescription = description.toLowerCase();

    if (normalizedTitle === "profile applied") {
        return {
            kind: "profile",
            tone: "positive",
            title: "Scheduler applied a profile",
            details: normalizeProfileDetails(description),
        };
    }

    if (normalizedTitle === "profile created") {
        return {
            kind: "profile",
            tone: "neutral",
            title: "Operator created a profile",
            details: normalizeProfileDetails(description),
        };
    }

    if (normalizedTitle === "agent heartbeat received") {
        return {
            kind: "health",
            tone: "positive",
            title: "Agent reported a heartbeat",
            details: description,
        };
    }

    if (
        normalizedTitle === "node degraded" ||
        normalizedTitle === "agent disconnected" ||
        normalizedTitle === "inference workload drained"
    ) {
        return {
            kind: "health",
            tone: "warning",
            title:
                normalizedTitle === "node degraded"
                    ? "Agent reported a health issue"
                    : normalizedTitle === "inference workload drained"
                      ? "Scheduler drained workloads from the node"
                      : "Agent disconnected from the node",
            details: description,
        };
    }

    if (
        normalizedDescription.includes("unavailable") ||
        normalizedDescription.includes("timeout")
    ) {
        return {
            kind: "health",
            tone: "warning",
            title: "Agent reported a health issue",
            details: description,
        };
    }

    if (normalizedTitle === "node enabled") {
        return {
            kind: "scheduling",
            tone: "positive",
            title: "Operator changed the node status",
            details: "Disabled -> Enabled",
        };
    }

    if (normalizedTitle === "node disabled") {
        return {
            kind: "scheduling",
            tone: "warning",
            title: "Operator changed the node status",
            details: "Enabled -> Disabled",
        };
    }

    if (
        normalizedTitle === "label added" ||
        normalizedTitle === "label removed" ||
        normalizedTitle === "labels updated"
    ) {
        return {
            kind: "labels",
            tone: "neutral",
            title: "Operator changed the node labels",
            details: formatLabelDetails(description),
        };
    }

    if (normalizedTitle === "name updated") {
        return {
            kind: "inventory",
            tone: "neutral",
            title: "Operator renamed the node",
            details: description
                .replace(/^Renamed node to\s+/i, "Name -> ")
                .replace(/\.$/, ""),
        };
    }

    if (normalizedTitle === "node registered") {
        return {
            kind: "inventory",
            tone: "positive",
            title: "Provisioning registered the node",
            details: description,
        };
    }

    return {
        kind: "generic",
        tone: "neutral",
        title: item.title,
        details: description,
    };
}

function groupEntriesByDate(entries: ActivityEntry[]) {
    const groups = new Map<string, ActivityEntry[]>();

    for (const entry of entries) {
        const existingEntries = groups.get(entry.dateLabel);

        if (existingEntries) {
            existingEntries.push(entry);
        } else {
            groups.set(entry.dateLabel, [entry]);
        }
    }

    return Array.from(groups.entries())
        .map(([dateLabel, groupedEntries]) => ({
            dateLabel,
            entries: groupedEntries.sort(
                (left, right) => right.occurredAtMs - left.occurredAtMs
            ),
        }))
        .sort(
            (left, right) =>
                right.entries[0]!.occurredAtMs - left.entries[0]!.occurredAtMs
        );
}

function parseOccurredAt(occurredAt: string) {
    const resolvedDate = new Date(occurredAt);

    if (Number.isNaN(resolvedDate.getTime())) {
        return null;
    }

    return resolvedDate;
}

function formatDateLabel(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
    }).format(date);
}

function formatAbsoluteTime(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

function formatRelativeTime(date: Date) {
    const diffMs = date.getTime() - Date.now();
    const future = diffMs > 0;
    const diffMinutes = Math.max(0, Math.floor(Math.abs(diffMs) / 60000));

    if (diffMinutes < 1) {
        return "just now";
    }

    if (diffMinutes < 60) {
        return formatRelativeUnit(diffMinutes, "minute", future);
    }

    const diffHours = Math.floor(diffMinutes / 60);

    if (diffHours < 24) {
        return formatRelativeUnit(diffHours, "hour", future);
    }

    const diffDays = Math.floor(diffHours / 24);

    if (diffDays < 7) {
        return formatRelativeUnit(diffDays, "day", future);
    }

    const diffWeeks = Math.floor(diffDays / 7);
    return formatRelativeUnit(diffWeeks, "week", future);
}

function normalizeProfileDetails(description: string) {
    const normalized = description
        .replace(/^Switched to\s+/i, "")
        .replace(/^Added\s+/i, "")
        .replace(/\s+profile\.?$/i, "")
        .replace(/\.$/, "")
        .trim();

    return normalized.startsWith("Profile ->")
        ? normalized
        : `Profile -> ${normalized}`;
}

function formatLabelDetails(description: string) {
    const normalized = description.replace(/\.$/, "");

    if (/^Added\s+/i.test(normalized)) {
        const label = normalized
            .replace(/^Added\s+/i, "")
            .replace(/\s+label.*$/i, "")
            .trim();

        return `Added label -> ${label}`;
    }

    if (/^Removed\s+/i.test(normalized)) {
        const label = normalized
            .replace(/^Removed\s+/i, "")
            .replace(/\s+label.*$/i, "")
            .trim();

        return `Removed label -> ${label}`;
    }

    return normalized;
}

function getIconChipClassName(tone: ActivityTone) {
    switch (tone) {
        case "positive":
            return "border-emerald-300 bg-emerald-50 text-emerald-700";
        case "warning":
            return "border-orange-300 bg-orange-50 text-orange-700";
        default:
            return "border-slate-300 bg-slate-50 text-slate-600";
    }
}

function getActivityIcon(kind: ActivityKind, tone: ActivityTone): IconSvgElement {
    switch (kind) {
        case "profile":
            return CpuSettingsIcon;
        case "health":
            return tone === "warning" ? AlertCircleIcon : CheckmarkCircle02Icon;
        case "scheduling":
            return Edit02Icon;
        case "labels":
            return LabelIcon;
        case "inventory":
            return FileEditIcon;
        default:
            return Edit02Icon;
    }
}

function formatRelativeUnit(
    value: number,
    unit: "minute" | "hour" | "day" | "week",
    future: boolean
) {
    const label = `${value} ${unit}${value === 1 ? "" : "s"}`;
    return future ? `in ${label}` : `${label} ago`;
}
