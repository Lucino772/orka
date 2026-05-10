"""remove node cpu model and kernel version

Revision ID: 7bbdb9de1101
Revises: 7d6e3d1d2f11
Create Date: 2026-05-10 12:00:00.000000+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7bbdb9de1101"
down_revision: Union[str, Sequence[str], None] = "7d6e3d1d2f11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("node_metadata", "cpu_model")
    op.drop_column("node_metadata", "kernel_version")


def downgrade() -> None:
    op.add_column(
        "node_metadata",
        sa.Column("kernel_version", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "node_metadata",
        sa.Column("cpu_model", sa.String(length=255), nullable=True),
    )
