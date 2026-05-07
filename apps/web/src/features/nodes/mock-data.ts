import type {
    NodeStatus,
    WorkspaceNode,
    WorkspaceNodeDetail,
} from "@/features/nodes/types";

export const statusOptions = [
    { value: "all", label: "All" },
    { value: "online", label: "Online" },
    { value: "degraded", label: "Degraded" },
    { value: "offline", label: "Offline" },
] as const;

export const nodeStatusLabels: Record<NodeStatus, string> = {
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
};

export const mockNodes: WorkspaceNode[] = [
    {
        id: "node-001",
        name: "Atlas Ridge 01",
        pool: "primary-training",
        region: "eu-west-1",
        provider: "Bare Metal",
        gpuModel: "NVIDIA H100 SXM",
        gpuCount: 8,
        cpuCores: 192,
        memoryGb: 2048,
        status: "online",
        utilizationPct: 84,
        lastHeartbeat: "12 seconds ago",
        labels: ["priority", "training", "mlx"],
    },
    {
        id: "node-002",
        name: "Northline Batch 03",
        pool: "batch-render",
        region: "us-east-2",
        provider: "Colocation",
        gpuModel: "NVIDIA L40S",
        gpuCount: 4,
        cpuCores: 96,
        memoryGb: 768,
        status: "online",
        utilizationPct: 57,
        lastHeartbeat: "21 seconds ago",
        labels: ["render", "overnight"],
    },
    {
        id: "node-003",
        name: "Helios Serve 02",
        pool: "latency-serving",
        region: "eu-central-1",
        provider: "Edge",
        gpuModel: "NVIDIA A100 80GB",
        gpuCount: 4,
        cpuCores: 128,
        memoryGb: 1024,
        status: "degraded",
        utilizationPct: 73,
        lastHeartbeat: "2 minutes ago",
        labels: ["inference", "low-latency", "autoscale"],
    },
    {
        id: "node-004",
        name: "Quartz Lab 07",
        pool: "research-lab",
        region: "us-west-1",
        provider: "Bare Metal",
        gpuModel: "NVIDIA RTX 6000 Ada",
        gpuCount: 2,
        cpuCores: 48,
        memoryGb: 384,
        status: "offline",
        utilizationPct: 0,
        lastHeartbeat: "18 minutes ago",
        labels: ["sandbox", "research"],
    },
    {
        id: "node-005",
        name: "Cinder Train 12",
        pool: "primary-training",
        region: "eu-west-1",
        provider: "Bare Metal",
        gpuModel: "NVIDIA H200",
        gpuCount: 8,
        cpuCores: 224,
        memoryGb: 3072,
        status: "online",
        utilizationPct: 91,
        lastHeartbeat: "9 seconds ago",
        labels: ["finetune", "reserved"],
    },
    {
        id: "node-006",
        name: "Harbor Edge 05",
        pool: "latency-serving",
        region: "ap-southeast-1",
        provider: "Edge",
        gpuModel: "NVIDIA L4",
        gpuCount: 2,
        cpuCores: 32,
        memoryGb: 256,
        status: "online",
        utilizationPct: 46,
        lastHeartbeat: "28 seconds ago",
        labels: ["inference", "regional"],
    },
    {
        id: "node-007",
        name: "Obsidian Queue 09",
        pool: "batch-render",
        region: "us-central-1",
        provider: "Colocation",
        gpuModel: "NVIDIA A40",
        gpuCount: 4,
        cpuCores: 64,
        memoryGb: 512,
        status: "offline",
        utilizationPct: 0,
        lastHeartbeat: "19 minutes ago",
        labels: ["maintenance"],
    },
    {
        id: "node-008",
        name: "Mistral Core 04",
        pool: "foundation-models",
        region: "eu-north-1",
        provider: "Bare Metal",
        gpuModel: "NVIDIA B200",
        gpuCount: 8,
        cpuCores: 256,
        memoryGb: 4096,
        status: "online",
        utilizationPct: 88,
        lastHeartbeat: "15 seconds ago",
        labels: ["pretrain", "high-memory"],
    },
    {
        id: "node-009",
        name: "Signal Relay 11",
        pool: "observability",
        region: "us-east-1",
        provider: "Edge",
        gpuModel: "NVIDIA T4",
        gpuCount: 1,
        cpuCores: 16,
        memoryGb: 128,
        status: "degraded",
        utilizationPct: 39,
        lastHeartbeat: "7 minutes ago",
        labels: ["metrics", "canary"],
    },
];

const mockNodeDetails: WorkspaceNodeDetail[] = [
    {
        nodeId: "node-001",
        isEnabled: true,
        activeProfileId: "profile-001-a",
        agentVersion: "orka-agent 1.14.2",
        profiles: [
            {
                id: "profile-001-a",
                gpuModel: "NVIDIA H100 SXM",
                gpuCount: 8,
                cpuCores: 192,
                memoryGb: 2048,
            },
            {
                id: "profile-001-b",
                gpuModel: "NVIDIA H100 SXM",
                gpuCount: 4,
                cpuCores: 96,
                memoryGb: 1024,
            },
        ],
        activityFeed: [
            {
                id: "activity-001-a",
                occurredAt: "2026-04-24T10:34:00.000Z",
                title: "Profile applied",
                description: "Profile -> NVIDIA H100 SXM / 192 CPU / 2048 GB RAM",
            },
            {
                id: "activity-001-b",
                occurredAt: "2026-04-24T10:22:00.000Z",
                title: "Agent heartbeat received",
                description: "Node reported healthy with 84% utilization.",
            },
            {
                id: "activity-001-c",
                occurredAt: "2026-04-24T09:36:00.000Z",
                title: "Labels updated",
                description: "Added mlx label for internal scheduling.",
            },
        ],
        systemInfo: {
            os: "Ubuntu 24.04 LTS",
            kernel: "6.8.0-31-generic",
            cpuModel: "AMD EPYC 9654",
            cpuArchitecture: "x86_64",
            totalCpuCores: 192,
            totalRamGb: 2048,
            containerRuntime: "containerd 2.0.2",
            uptime: "17 days",
        },
    },
    {
        nodeId: "node-003",
        isEnabled: true,
        activeProfileId: "profile-003-a",
        agentVersion: "orka-agent 1.13.9",
        profiles: [
            {
                id: "profile-003-a",
                gpuModel: "NVIDIA A100 80GB",
                gpuCount: 4,
                cpuCores: 128,
                memoryGb: 1024,
            },
        ],
        activityFeed: [
            {
                id: "activity-003-a",
                occurredAt: "2026-04-24T15:25:00.000Z",
                title: "Node degraded",
                description:
                    "Agent marked one GPU as unavailable during health checks.",
            },
            {
                id: "activity-003-b",
                occurredAt: "2026-04-24T14:59:00.000Z",
                title: "Inference workload drained",
                description:
                    "Workloads were rescheduled away from the unhealthy device.",
            },
        ],
        systemInfo: {
            os: "Ubuntu 22.04 LTS",
            kernel: "6.5.0-41-generic",
            cpuModel: "Intel Xeon Platinum 8480+",
            cpuArchitecture: "x86_64",
            totalCpuCores: 128,
            totalRamGb: 1024,
            containerRuntime: "containerd 1.7.24",
            uptime: "6 days",
        },
    },
    {
        nodeId: "node-007",
        isEnabled: false,
        activeProfileId: null,
        agentVersion: "orka-agent 1.12.4",
        profiles: [
            {
                id: "profile-007-a",
                gpuModel: "NVIDIA A40",
                gpuCount: 4,
                cpuCores: 64,
                memoryGb: 512,
            },
        ],
        activityFeed: [
            {
                id: "activity-007-a",
                occurredAt: "2026-04-24T18:41:00.000Z",
                title: "Node disabled",
                description: "Operator disabled the node for maintenance.",
            },
            {
                id: "activity-007-b",
                occurredAt: "2026-04-24T18:38:00.000Z",
                title: "Agent disconnected",
                description: "Heartbeat timeout exceeded expected threshold.",
            },
        ],
        systemInfo: {
            os: "Ubuntu 22.04 LTS",
            kernel: "5.15.0-112-generic",
            cpuModel: "AMD EPYC 7543",
            cpuArchitecture: "x86_64",
            totalCpuCores: 64,
            totalRamGb: 512,
            containerRuntime: "containerd 1.7.19",
            uptime: "41 days",
        },
    },
];

let workspaceNodesStore = mockNodes.map(cloneNode);
const workspaceNodeDetailsStore = new Map(
    mockNodeDetails.map((detail) => [detail.nodeId, cloneNodeDetail(detail)])
);

function cloneNode(node: WorkspaceNode): WorkspaceNode {
    return {
        ...node,
        labels: [...node.labels],
    };
}

function cloneNodeDetail(detail: WorkspaceNodeDetail): WorkspaceNodeDetail {
    return {
        ...detail,
        profiles: detail.profiles.map((profile) => ({ ...profile })),
        activityFeed: detail.activityFeed.map((item) => ({ ...item })),
        systemInfo: {
            ...detail.systemInfo,
        },
    };
}

function createDefaultNodeDetail(node: WorkspaceNode): WorkspaceNodeDetail {
    const defaultProfileId = `${node.id}-profile-default`;

    return {
        nodeId: node.id,
        isEnabled: node.status !== "offline",
        activeProfileId: node.status !== "offline" ? defaultProfileId : null,
        agentVersion: "orka-agent 1.14.2",
        profiles: [
            {
                id: defaultProfileId,
                gpuModel: node.gpuModel,
                gpuCount: node.gpuCount,
                cpuCores: node.cpuCores,
                memoryGb: node.memoryGb,
            },
        ],
        activityFeed: [
            {
                id: `${node.id}-activity-default`,
                occurredAt: getDefaultActivityTimestamp(node.id),
                title: "Node registered",
                description: "Node was added to the workspace inventory.",
            },
        ],
        systemInfo: {
            os: "Unknown",
            kernel: "Unknown",
            cpuModel: "Unknown",
            cpuArchitecture: "x86_64",
            totalCpuCores: node.cpuCores,
            totalRamGb: node.memoryGb,
            containerRuntime: "Unknown",
            uptime: "Unknown",
        },
    };
}

function getDefaultActivityTimestamp(nodeId: string) {
    const numericId = Number(nodeId.replace(/\D+/g, "")) || 0;
    const day = 1 + (numericId % 20);
    const hour = 8 + (numericId % 10);
    const minute = (numericId * 7) % 60;

    return new Date(Date.UTC(2026, 3, day, hour, minute, 0)).toISOString();
}

export function getWorkspaceNodes() {
    return workspaceNodesStore.map(cloneNode);
}

export function getWorkspaceNode(nodeId: string) {
    const node = workspaceNodesStore.find((entry) => entry.id === nodeId);

    return node ? cloneNode(node) : undefined;
}

export function upsertWorkspaceNode(node: WorkspaceNode) {
    const index = workspaceNodesStore.findIndex((entry) => entry.id === node.id);

    if (index >= 0) {
        workspaceNodesStore[index] = cloneNode(node);
    } else {
        workspaceNodesStore = [cloneNode(node), ...workspaceNodesStore];
    }

    if (!workspaceNodeDetailsStore.has(node.id)) {
        workspaceNodeDetailsStore.set(node.id, createDefaultNodeDetail(node));
    }

    return cloneNode(node);
}

export function updateWorkspaceNode(nodeId: string, updates: Partial<WorkspaceNode>) {
    const index = workspaceNodesStore.findIndex((entry) => entry.id === nodeId);

    if (index < 0) {
        return undefined;
    }

    const nextNode: WorkspaceNode = {
        ...workspaceNodesStore[index],
        ...updates,
        labels: updates.labels
            ? [...updates.labels]
            : [...workspaceNodesStore[index].labels],
    };

    workspaceNodesStore[index] = nextNode;

    return cloneNode(nextNode);
}

export function getWorkspaceNodeDetail(nodeId: string) {
    const node = workspaceNodesStore.find((entry) => entry.id === nodeId);

    if (!node) {
        return undefined;
    }

    const existingDetail = workspaceNodeDetailsStore.get(nodeId);

    if (existingDetail) {
        return cloneNodeDetail(existingDetail);
    }

    const nextDetail = createDefaultNodeDetail(node);
    workspaceNodeDetailsStore.set(nodeId, nextDetail);

    return cloneNodeDetail(nextDetail);
}

export function saveWorkspaceNodeDetail(detail: WorkspaceNodeDetail) {
    workspaceNodeDetailsStore.set(detail.nodeId, cloneNodeDetail(detail));
    return cloneNodeDetail(detail);
}
