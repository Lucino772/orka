import type { NodeDetail } from "@/api/nodes";

export function OverviewConsole({ node }: { node: NodeDetail }) {
    const metadata = node.metadata;
    const rows = [
        ["Hostname", metadata?.hostname ?? "—"],
        ["Agent", metadata?.agent_version ?? "—"],
        ["OS", joinParts(metadata?.os_name, metadata?.os_version)],
        ["Architecture", metadata?.cpu_architecture ?? "—"],
        ["CPU cores", metadata?.cpu_core_count ? `${metadata.cpu_core_count}` : "—"],
        ["RAM", formatBytes(metadata?.ram_bytes)],
    ] as const;

    return (
        <div className="space-y-6">
            <section className="space-y-3">
                <div className="flex flex-wrap items-baseline justify-between gap-3 px-4">
                    <h2 className="text-foreground text-sm font-semibold">System</h2>
                    <p className="text-muted-foreground text-sm">
                        Updated {formatDateTime(metadata?.metadata_updated_at)}
                    </p>
                </div>
                <div className="border-y">
                    {rows.map(([label, value], index) => (
                        <FactRow
                            key={label}
                            label={label}
                            value={value}
                            border={index !== rows.length - 1}
                        />
                    ))}
                </div>
            </section>

            <section className="space-y-3">
                <div className="px-4">
                    <h2 className="text-foreground text-sm font-semibold">GPUs</h2>
                </div>
                {!metadata?.gpus.length ? (
                    <div className="border-y px-4 py-4">
                        <p className="text-muted-foreground text-sm">
                            No GPUs reported yet.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-hidden border-y">
                        <table className="w-full table-fixed text-sm">
                            <thead className="bg-muted/20">
                                <tr className="border-border border-b">
                                    <HeaderCell>GPU</HeaderCell>
                                    <HeaderCell>Model</HeaderCell>
                                    <HeaderCell>VRAM</HeaderCell>
                                    <HeaderCell>PCI bus</HeaderCell>
                                </tr>
                            </thead>
                            <tbody>
                                {metadata.gpus.map((gpu) => (
                                    <tr
                                        key={`${gpu.gpu_index}-${gpu.pci_bus_id ?? gpu.serial_number ?? "gpu"}`}
                                        className="border-border border-b last:border-b-0"
                                    >
                                        <BodyCell>{String(gpu.gpu_index)}</BodyCell>
                                        <BodyCell>
                                            {gpu.model ?? gpu.device_name ?? "—"}
                                        </BodyCell>
                                        <BodyCell>
                                            {formatBytes(gpu.vram_bytes)}
                                        </BodyCell>
                                        <BodyCell>{gpu.pci_bus_id ?? "—"}</BodyCell>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}

function FactRow({
    label,
    value,
    border = false,
}: {
    label: string;
    value: string;
    border?: boolean;
}) {
    return (
        <div className={border ? "border-border border-b" : undefined}>
            <div className="grid gap-2 px-4 py-3 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <div className="font-mono text-[11px] tracking-[0.18em] text-slate-500 uppercase">
                    {label}
                </div>
                <div className="text-foreground text-sm">{value}</div>
            </div>
        </div>
    );
}

function HeaderCell({ children }: { children: string }) {
    return (
        <th className="text-muted-foreground px-4 py-3 text-left text-[11px] font-medium tracking-[0.18em] uppercase">
            {children}
        </th>
    );
}

function BodyCell({ children }: { children: string }) {
    return <td className="px-4 py-3">{children}</td>;
}

function joinParts(...parts: Array<string | null | undefined>) {
    const filtered = parts.filter(Boolean);
    return filtered.length ? filtered.join(" ") : "—";
}

function formatDateTime(value: string | null | undefined) {
    if (!value) {
        return "—";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function formatBytes(value: number | null | undefined) {
    if (value == null) {
        return "—";
    }
    if (value < 1024) {
        return `${value} B`;
    }
    const units = ["KB", "MB", "GB", "TB"];
    let size = value;
    let unitIndex = -1;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex += 1;
    }
    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`;
}
