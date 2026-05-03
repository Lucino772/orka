from __future__ import annotations

from sqlalchemy import (
    Column,
    ForeignKey,
    MetaData,
    String,
    Table,
    UniqueConstraint,
    Uuid,
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
    Column("secret_hash", String(length=64), nullable=False),
    UniqueConstraint("workspace_id", "name"),
)
