from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING, Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from sqlalchemy import delete, func, insert, outerjoin, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from orka_db.schema import (
    node_activity_log_table,
    node_gpu_metadata_table,
    node_metadata_table,
    node_table,
)

if TYPE_CHECKING:
    from sqlalchemy.ext.asyncio import AsyncConnection


NodeStatus = Literal["online", "offline"]
NodeHealth = Literal["unknown", "healthy", "degraded", "error"]
NodeActivitySeverity = Literal["info", "warning", "error"]


class NodeSummary(BaseModel):
    id: UUID
    workspace_id: UUID
    name: str
    status: NodeStatus
    health: NodeHealth
    has_secret: bool = False
    hostname: str | None = None
    agent_version: str | None = None
    os_name: str | None = None
    os_version: str | None = None
    cpu_core_count: int | None = None
    ram_bytes: int | None = None
    gpu_count: int | None = None
    gpu_model: str | None = None


class NodeCreateResponse(NodeSummary):
    pass


class NodeRenameResponse(NodeSummary):
    pass


class NodeTokenResponse(BaseModel):
    token: str


class NodeGpuMetadataView(BaseModel):
    gpu_index: int
    vendor: str | None = None
    model: str | None = None
    vram_bytes: int | None = None
    device_name: str | None = None
    serial_number: str | None = None
    pci_bus_id: str | None = None
    metadata_updated_at: datetime


class NodeMetadataView(BaseModel):
    agent_version: str | None = None
    hostname: str | None = None
    os_name: str | None = None
    os_version: str | None = None
    cpu_architecture: str | None = None
    cpu_core_count: int | None = None
    ram_bytes: int | None = None
    metadata_updated_at: datetime
    gpus: list[NodeGpuMetadataView]


class NodeDetail(NodeSummary):
    metadata: NodeMetadataView | None


class NodeActivityLogEntry(BaseModel):
    id: UUID
    event_type: str
    severity: NodeActivitySeverity
    occurred_at: datetime
    payload: dict[str, Any]
    message: str | None


class NodeSystemMetadataPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    os_name: str | None = None
    os_version: str | None = None
    cpu_architecture: str | None = None
    cpu_core_count: int | None = None
    ram_bytes: int | None = None


class NodeGpuMetadataPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gpu_index: int
    vendor: str | None = None
    model: str | None = None
    vram_bytes: int | None = None
    device_name: str | None = None
    serial_number: str | None = None
    pci_bus_id: str | None = None


class NodeMetadataPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sent_at: datetime
    agent_version: str | None = None
    hostname: str | None = None
    system: NodeSystemMetadataPayload | None = None
    gpus: list[NodeGpuMetadataPayload]


class NodeMetadataAck(BaseModel):
    ok: bool
    error: str | None = None


class NodeService:
    async def append(
        self,
        connection: AsyncConnection,
        *,
        node_id: UUID,
        event_type: str,
        severity: NodeActivitySeverity,
        payload: dict[str, Any],
        message: str | None,
    ) -> None:
        await connection.execute(
            insert(node_activity_log_table).values(
                id=uuid.uuid4(),
                node_id=node_id,
                event_type=event_type,
                severity=severity,
                occurred_at=datetime.now(tz=UTC),
                payload=payload,
                message=message,
            )
        )

    async def set_status(
        self,
        connection: AsyncConnection,
        *,
        node_id: UUID,
        status: NodeStatus,
        reason: str,
        message: str,
    ) -> None:
        await connection.execute(
            update(node_table)
            .where(node_table.c.id == node_id)
            .values(status=status, updated_at=datetime.now(tz=UTC))
        )
        await self.append(
            connection,
            node_id=node_id,
            event_type="node.status.updated",
            severity="info",
            payload={"status": status, "reason": reason},
            message=message,
        )

    async def set_health(
        self,
        connection: AsyncConnection,
        *,
        node_id: UUID,
        health: NodeHealth,
        reason: str,
        message: str,
        severity: NodeActivitySeverity | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        await connection.execute(
            update(node_table)
            .where(node_table.c.id == node_id)
            .values(health=health, updated_at=datetime.now(tz=UTC))
        )
        await self.append(
            connection,
            node_id=node_id,
            event_type="node.health.updated",
            severity=severity or _health_to_severity(health),
            payload={"health": health, "reason": reason, **(payload or {})},
            message=message,
        )

    async def ingest(
        self,
        connection: AsyncConnection,
        *,
        node_id: UUID,
        payload: NodeMetadataPayload,
    ) -> NodeHealth:
        now = datetime.now(tz=UTC)
        current_health = (
            await connection.execute(
                select(node_table.c.health).where(node_table.c.id == node_id)
            )
        ).scalar_one()
        previous_gpu_count = await self._get_gpu_count(connection, node_id)
        metadata_values = {
            "node_id": node_id,
            "agent_version": payload.agent_version,
            "hostname": payload.hostname,
            "os_name": payload.system.os_name if payload.system else None,
            "os_version": payload.system.os_version if payload.system else None,
            "cpu_architecture": payload.system.cpu_architecture
            if payload.system
            else None,
            "cpu_core_count": payload.system.cpu_core_count if payload.system else None,
            "ram_bytes": payload.system.ram_bytes if payload.system else None,
            "metadata_updated_at": now,
        }
        await connection.execute(
            pg_insert(node_metadata_table)
            .values(**metadata_values)
            .on_conflict_do_update(
                index_elements=[node_metadata_table.c.node_id],
                set_=metadata_values,
            )
        )

        await connection.execute(
            delete(node_gpu_metadata_table).where(
                node_gpu_metadata_table.c.node_id == node_id
            )
        )
        gpu_rows = [
            {
                "id": uuid.uuid4(),
                "node_id": node_id,
                "gpu_index": gpu.gpu_index,
                "vendor": gpu.vendor,
                "model": gpu.model,
                "vram_bytes": gpu.vram_bytes,
                "device_name": gpu.device_name,
                "serial_number": gpu.serial_number,
                "pci_bus_id": gpu.pci_bus_id,
                "metadata_updated_at": now,
            }
            for gpu in payload.gpus
        ]
        if gpu_rows:
            await connection.execute(insert(node_gpu_metadata_table), gpu_rows)

        current_gpu_count = len(payload.gpus)
        health: NodeHealth = (
            "degraded"
            if previous_gpu_count is not None and previous_gpu_count > current_gpu_count
            else "healthy"
        )
        await connection.execute(
            update(node_table)
            .where(node_table.c.id == node_id)
            .values(health=health, updated_at=now)
        )

        await self.append(
            connection,
            node_id=node_id,
            event_type="node.metadata.updated",
            severity="info",
            payload=payload.model_dump(mode="json"),
            message="Node metadata updated.",
        )
        if current_health != health:
            await self.append(
                connection,
                node_id=node_id,
                event_type="node.health.updated",
                severity=_health_to_severity(health),
                payload={
                    "health": health,
                    "reason": (
                        "gpu_inventory_changed"
                        if health == "degraded"
                        else "metadata_ingested"
                    ),
                    "previous_gpu_count": previous_gpu_count,
                    "gpu_count": current_gpu_count,
                },
                message=(
                    "Node health degraded after metadata update."
                    if health == "degraded"
                    else "Node health is healthy."
                ),
            )
        return health

    async def _get_gpu_count(
        self, connection: AsyncConnection, node_id: UUID
    ) -> int | None:
        rows = (
            await connection.execute(
                select(node_gpu_metadata_table.c.id).where(
                    node_gpu_metadata_table.c.node_id == node_id
                )
            )
        ).all()
        if not rows:
            existing_metadata = (
                await connection.execute(
                    select(node_metadata_table.c.node_id).where(
                        node_metadata_table.c.node_id == node_id
                    )
                )
            ).scalar_one_or_none()
            return 0 if existing_metadata is not None else None
        return len(rows)

    async def list_nodes(
        self, connection: AsyncConnection, workspace_id: UUID
    ) -> list[NodeSummary]:
        gpu_count = (
            select(func.count(node_gpu_metadata_table.c.id))
            .where(node_gpu_metadata_table.c.node_id == node_table.c.id)
            .scalar_subquery()
        )
        gpu_model = (
            select(node_gpu_metadata_table.c.model)
            .where(node_gpu_metadata_table.c.node_id == node_table.c.id)
            .order_by(node_gpu_metadata_table.c.gpu_index.asc())
            .limit(1)
            .scalar_subquery()
        )
        joined = outerjoin(
            node_table,
            node_metadata_table,
            node_table.c.id == node_metadata_table.c.node_id,
        )
        rows = (
            await connection.execute(
                select(
                    node_table.c.id,
                    node_table.c.workspace_id,
                    node_table.c.name,
                    node_table.c.status,
                    node_table.c.health,
                    node_table.c.secret_hash,
                    node_metadata_table.c.hostname,
                    node_metadata_table.c.agent_version,
                    node_metadata_table.c.os_name,
                    node_metadata_table.c.os_version,
                    node_metadata_table.c.cpu_core_count,
                    node_metadata_table.c.ram_bytes,
                    gpu_count.label("gpu_count"),
                    gpu_model.label("gpu_model"),
                )
                .select_from(joined)
                .where(node_table.c.workspace_id == workspace_id)
                .order_by(node_table.c.name.asc())
            )
        ).mappings()
        return [
            NodeSummary.model_validate(
                {**row, "has_secret": row["secret_hash"] is not None}
            )
            for row in rows
        ]

    async def get_node(
        self, connection: AsyncConnection, workspace_id: UUID, node_id: UUID
    ) -> NodeDetail | None:
        node_row = (
            (
                await connection.execute(
                    select(
                        node_table.c.id,
                        node_table.c.workspace_id,
                        node_table.c.name,
                        node_table.c.status,
                        node_table.c.health,
                        node_table.c.secret_hash,
                    ).where(
                        node_table.c.workspace_id == workspace_id,
                        node_table.c.id == node_id,
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if node_row is None:
            return None

        metadata_row = (
            (
                await connection.execute(
                    select(node_metadata_table).where(
                        node_metadata_table.c.node_id == node_id
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        gpus = (
            (
                await connection.execute(
                    select(node_gpu_metadata_table)
                    .where(node_gpu_metadata_table.c.node_id == node_id)
                    .order_by(node_gpu_metadata_table.c.gpu_index.asc())
                )
            )
            .mappings()
            .all()
        )

        metadata = None
        if metadata_row is not None:
            metadata = NodeMetadataView.model_validate(
                {
                    **metadata_row,
                    "gpus": [
                        NodeGpuMetadataView.model_validate(gpu).model_dump(
                            mode="python"
                        )
                        for gpu in gpus
                    ],
                }
            )

        return NodeDetail.model_validate(
            {
                **node_row,
                "has_secret": node_row["secret_hash"] is not None,
                "metadata": metadata,
            }
        )

    async def list_activity(
        self,
        connection: AsyncConnection,
        workspace_id: UUID,
        node_id: UUID,
        *,
        limit: int = 50,
    ) -> list[NodeActivityLogEntry] | None:
        exists = (
            await connection.execute(
                select(node_table.c.id).where(
                    node_table.c.workspace_id == workspace_id,
                    node_table.c.id == node_id,
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            return None

        rows = (
            await connection.execute(
                select(
                    node_activity_log_table.c.id,
                    node_activity_log_table.c.event_type,
                    node_activity_log_table.c.severity,
                    node_activity_log_table.c.occurred_at,
                    node_activity_log_table.c.payload,
                    node_activity_log_table.c.message,
                )
                .where(node_activity_log_table.c.node_id == node_id)
                .order_by(node_activity_log_table.c.occurred_at.desc())
                .limit(limit)
            )
        ).mappings()
        return [NodeActivityLogEntry.model_validate(row) for row in rows]

    async def rename_node(
        self,
        connection: AsyncConnection,
        workspace_id: UUID,
        node_id: UUID,
        *,
        name: str,
    ) -> NodeRenameResponse | None:
        row = (
            (
                await connection.execute(
                    update(node_table)
                    .where(
                        node_table.c.workspace_id == workspace_id,
                        node_table.c.id == node_id,
                    )
                    .values(name=name, updated_at=datetime.now(tz=UTC))
                    .returning(
                        node_table.c.id,
                        node_table.c.workspace_id,
                        node_table.c.name,
                        node_table.c.status,
                        node_table.c.health,
                        node_table.c.secret_hash,
                    )
                )
            )
            .mappings()
            .one_or_none()
        )
        if row is None:
            return None
        return NodeRenameResponse.model_validate(
            {**row, "has_secret": row["secret_hash"] is not None}
        )

    async def set_secret_hash(
        self,
        connection: AsyncConnection,
        workspace_id: UUID,
        node_id: UUID,
        *,
        secret_hash: str,
    ) -> bool:
        updated = await connection.execute(
            update(node_table)
            .where(
                node_table.c.workspace_id == workspace_id,
                node_table.c.id == node_id,
            )
            .values(secret_hash=secret_hash, updated_at=datetime.now(tz=UTC))
        )
        return updated.rowcount > 0

    async def delete_node(
        self, connection: AsyncConnection, workspace_id: UUID, node_id: UUID
    ) -> bool:
        exists = (
            await connection.execute(
                select(node_table.c.id).where(
                    node_table.c.workspace_id == workspace_id,
                    node_table.c.id == node_id,
                )
            )
        ).scalar_one_or_none()
        if exists is None:
            return False

        await connection.execute(
            delete(node_activity_log_table).where(
                node_activity_log_table.c.node_id == node_id
            )
        )
        await connection.execute(
            delete(node_gpu_metadata_table).where(
                node_gpu_metadata_table.c.node_id == node_id
            )
        )
        await connection.execute(
            delete(node_metadata_table).where(node_metadata_table.c.node_id == node_id)
        )
        await connection.execute(delete(node_table).where(node_table.c.id == node_id))
        return True


def _health_to_severity(health: NodeHealth) -> NodeActivitySeverity:
    if health == "degraded":
        return "warning"
    if health == "error":
        return "error"
    return "info"
