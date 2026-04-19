from __future__ import annotations

from sqlalchemy import Column, MetaData, String, Table, Uuid

metadata = MetaData()

workspace_table = Table(
    "workspace",
    metadata,
    Column("id", Uuid, primary_key=True),
    Column("name", String(length=255), nullable=False),
    Column("slug", String(length=255), nullable=False, unique=True),
)
