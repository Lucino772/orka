"""make node secret nullable

Revision ID: 7d6e3d1d2f11
Revises: ecea389246fd
Create Date: 2026-05-08 12:00:00.000000+00:00

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "7d6e3d1d2f11"
down_revision: Union[str, Sequence[str], None] = "ecea389246fd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "node", "secret_hash", existing_type=sa.String(length=64), nullable=True
    )


def downgrade() -> None:
    op.alter_column(
        "node", "secret_hash", existing_type=sa.String(length=64), nullable=False
    )
