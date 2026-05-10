import { useState, type ReactNode } from "react";

import type { NodeActivityEntry } from "@/api/nodes";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

export function ActivityTimeline({ items }: { items: NodeActivityEntry[] }) {
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedItem = items.find((item) => item.id === selectedId) ?? null;

    if (!items.length) {
        return (
            <div className="py-10 text-center">
                <p className="text-foreground text-sm font-medium">No activity yet</p>
                <p className="text-muted-foreground mt-2 text-sm">
                    Connection, metadata, and health events will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="border-border flex h-full min-h-0 min-w-0 flex-1 flex-col border-y">
            {selectedItem ? (
                <ResizablePanelGroup
                    orientation="horizontal"
                    className="min-h-0 flex-1"
                >
                    <ResizablePanel minSize="50%" maxSize="75%">
                        <ActivityTable
                            items={items}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                        />
                    </ResizablePanel>

                    <ResizableHandle
                        withHandle
                        className="w-2 bg-slate-50 transition-colors hover:bg-slate-100"
                    />

                    <ResizablePanel minSize="25%" maxSize="50%">
                        <div className="bg-muted/20 h-full min-h-0 min-w-[10rem] p-3">
                            <PayloadPanel
                                item={selectedItem}
                                onClose={() => setSelectedId(null)}
                            />
                        </div>
                    </ResizablePanel>
                </ResizablePanelGroup>
            ) : (
                <ActivityTable
                    items={items}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                />
            )}
        </div>
    );
}

function ActivityTable({
    items,
    selectedId,
    onSelect,
}: {
    items: NodeActivityEntry[];
    selectedId: string | null;
    onSelect: (id: string) => void;
}) {
    return (
        <div className="flex h-full min-h-0 flex-col">
            <table className="w-full table-fixed">
                <colgroup>
                    <col style={{ width: "110px" }} />
                    <col />
                    <col style={{ width: "220px" }} />
                </colgroup>
                <thead className="bg-background">
                    <tr className="border-border border-b">
                        <HeaderCell>Severity</HeaderCell>
                        <HeaderCell>Event</HeaderCell>
                        <HeaderCell>Time</HeaderCell>
                    </tr>
                </thead>
            </table>

            <div className="min-h-0 flex-1 overflow-y-auto">
                <table className="w-full table-fixed">
                    <colgroup>
                        <col style={{ width: "110px" }} />
                        <col />
                        <col style={{ width: "220px" }} />
                    </colgroup>
                    <tbody>
                        {items.map((item) => {
                            const isSelected = item.id === selectedId;

                            return (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        "border-border border-b align-top transition-colors",
                                        "hover:bg-muted/15 cursor-pointer",
                                        isSelected && "bg-muted/20"
                                    )}
                                    onClick={() => onSelect(item.id)}
                                >
                                    <BodyCell>
                                        <span
                                            className={cn(
                                                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium capitalize",
                                                item.severity === "error"
                                                    ? "bg-red-50 text-red-700"
                                                    : item.severity === "warning"
                                                      ? "bg-orange-50 text-orange-700"
                                                      : "bg-slate-100 text-slate-700"
                                            )}
                                        >
                                            {item.severity}
                                        </span>
                                    </BodyCell>
                                    <BodyCell>
                                        <div className="text-foreground font-medium">
                                            {item.event_type}
                                        </div>
                                        <div className="text-muted-foreground mt-1 text-sm">
                                            {item.message ?? "No message"}
                                        </div>
                                    </BodyCell>
                                    <BodyCell>
                                        <div className="text-muted-foreground text-sm">
                                            {formatDateTime(item.occurred_at)}
                                        </div>
                                    </BodyCell>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function PayloadPanel({
    item,
    onClose,
}: {
    item: NodeActivityEntry;
    onClose: () => void;
}) {
    const hasPayload = Object.keys(item.payload).length > 0;

    return (
        <div className="flex h-full min-h-0 flex-col rounded-xl bg-slate-50/55 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.04)]">
            <div className="px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <SeverityIcon severity={item.severity} />
                            <div className="text-foreground text-sm font-semibold">
                                {item.event_type}
                            </div>
                        </div>
                        <div className="text-muted-foreground mt-1 text-sm">
                            {item.message ?? "No message"}
                        </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                        <div className="text-muted-foreground text-sm">
                            {formatDateTime(item.occurred_at)}
                        </div>
                        <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground inline-flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors"
                            onClick={onClose}
                            aria-label="Close payload panel"
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
                        </button>
                    </div>
                </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
                {hasPayload ? (
                    <div className="overflow-hidden rounded-lg bg-slate-50/80">
                        <pre className="w-full overflow-x-auto px-4 py-4 text-sm whitespace-pre-wrap text-slate-800">
                            {JSON.stringify(item.payload, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-lg bg-slate-50/80 px-6 text-center">
                        <div>
                            <p className="text-foreground text-sm font-medium">
                                No payload recorded
                            </p>
                            <p className="text-muted-foreground mt-2 text-sm">
                                This event only includes its summary message.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HeaderCell({ children }: { children: ReactNode }) {
    return (
        <th className="text-muted-foreground px-4 py-3 text-left text-[11px] font-medium tracking-[0.18em] uppercase">
            {children}
        </th>
    );
}

function BodyCell({ children }: { children: ReactNode }) {
    return <td className="px-4 py-3 text-sm">{children}</td>;
}

function SeverityIcon({ severity }: { severity: NodeActivityEntry["severity"] }) {
    const tone =
        severity === "error"
            ? "text-red-600"
            : severity === "warning"
              ? "text-orange-600"
              : "text-slate-500";

    return (
        <span className={cn("inline-flex size-4 items-center justify-center", tone)}>
            <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true" fill="none">
                {severity === "info" ? (
                    <>
                        <circle
                            cx="8"
                            cy="8"
                            r="6"
                            fill="currentColor"
                            opacity="0.16"
                        />
                        <circle cx="8" cy="8" r="1.25" fill="currentColor" />
                    </>
                ) : severity === "warning" ? (
                    <>
                        <path
                            d="M8 2.5 14 13H2L8 2.5Z"
                            fill="currentColor"
                            opacity="0.16"
                        />
                        <path
                            d="M8 5.6v3.4M8 11.1h.01"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </>
                ) : (
                    <>
                        <circle
                            cx="8"
                            cy="8"
                            r="6"
                            fill="currentColor"
                            opacity="0.16"
                        />
                        <path
                            d="M8 4.9v3.9M8 10.9h.01"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </>
                )}
            </svg>
        </span>
    );
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}
