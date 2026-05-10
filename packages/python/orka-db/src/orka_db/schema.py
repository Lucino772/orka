from __future__ import annotations

from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.dialects.postgresql import JSONB

node_status_enum = Enum("online", "offline", name="node_status")
node_health_enum = Enum(
    "unknown",
    "healthy",
    "degraded",
    "error",
    name="node_health",
)
node_activity_severity_enum = Enum(
    "info",
    "warning",
    "error",
    name="node_activity_severity",
)

metadata = MetaData()

workspace_table = Table(
    "workspace",
    metadata,
    Column("id", Uuid, primary_key=True),
    Column("name", String(length=255), nullable=False),
    Column("slug", String(length=255), nullable=False, unique=True),
)

node_table = Table(
    "node",
    metadata,
    Column("id", Uuid, primary_key=True),
    Column("workspace_id", Uuid, ForeignKey("workspace.id"), nullable=False),
    Column("name", String(length=255), nullable=False),
    Column("secret_hash", String(length=64), nullable=True),
    Column("status", node_status_enum, nullable=False),
    Column("health", node_health_enum, nullable=False),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("updated_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("workspace_id", "name"),
)

node_metadata_table = Table(
    "node_metadata",
    metadata,
    Column("node_id", Uuid, ForeignKey("node.id"), primary_key=True),
    Column("agent_version", String(length=255), nullable=True),
    Column("hostname", String(length=255), nullable=True),
    Column("os_name", String(length=255), nullable=True),
    Column("os_version", String(length=255), nullable=True),
    Column("cpu_architecture", String(length=64), nullable=True),
    Column("cpu_core_count", Integer, nullable=True),
    Column("ram_bytes", BigInteger, nullable=True),
    Column("metadata_updated_at", DateTime(timezone=True), nullable=False),
)

node_gpu_metadata_table = Table(
    "node_gpu_metadata",
    metadata,
    Column("id", Uuid, primary_key=True),
    Column("node_id", Uuid, ForeignKey("node.id"), nullable=False),
    Column("gpu_index", Integer, nullable=False),
    Column("vendor", String(length=128), nullable=True),
    Column("model", String(length=255), nullable=True),
    Column("vram_bytes", BigInteger, nullable=True),
    Column("device_name", String(length=255), nullable=True),
    Column("serial_number", String(length=255), nullable=True),
    Column("pci_bus_id", String(length=128), nullable=True),
    Column("metadata_updated_at", DateTime(timezone=True), nullable=False),
    UniqueConstraint("node_id", "gpu_index"),
)

node_activity_log_table = Table(
    "node_activity_log",
    metadata,
    Column("id", Uuid, primary_key=True),
    Column("node_id", Uuid, ForeignKey("node.id"), nullable=False),
    Column("event_type", String(length=128), nullable=False),
    Column("severity", node_activity_severity_enum, nullable=False),
    Column("occurred_at", DateTime(timezone=True), nullable=False),
    Column("payload", JSONB, nullable=False),
    Column("message", Text, nullable=True),
)
