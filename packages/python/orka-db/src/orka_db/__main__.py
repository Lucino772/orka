from __future__ import annotations

from orka_db.lib import Migrations

if __name__ == "__main__":
    Migrations("postgresql+psycopg://postgres:postgres@127.0.0.1:5432/orka").run_cli()
