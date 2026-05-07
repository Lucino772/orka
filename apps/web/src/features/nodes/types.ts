export type NodeStatus = "online" | "degraded" | "offline";

export type NodeProvider = "Bare Metal" | "Colocation" | "Edge";

export interface WorkspaceNode {
    id: string;
    name: string;
    pool: string;
    region: string;
    provider: NodeProvider;
    gpuModel: string;
    gpuCount: number;
    cpuCores: number;
    memoryGb: number;
    status: NodeStatus;
    utilizationPct: number;
    lastHeartbeat: string;
    labels: string[];
}

export interface NodeProfile {
    id: string;
    gpuModel: string;
    gpuCount: number;
    cpuCores: number;
    memoryGb: number;
}

export interface NodeActivityItem {
    id: string;
    occurredAt: string;
    title: string;
    description: string;
}

export interface NodeSystemInfo {
    os: string;
    kernel: string;
    cpuModel: string;
    cpuArchitecture: string;
    totalCpuCores: number;
    totalRamGb: number;
    containerRuntime: string;
    uptime: string;
}

export interface WorkspaceNodeDetail {
    nodeId: string;
    isEnabled: boolean;
    activeProfileId: string | null;
    agentVersion: string;
    profiles: NodeProfile[];
    activityFeed: NodeActivityItem[];
    systemInfo: NodeSystemInfo;
}
