from __future__ import annotations

import sys
from pathlib import Path

from alembic.config import CommandLine, Config

_CURRENT_DIR = Path(__file__).parent


class Migrations:
    def __init__(self, database_url: str) -> None:
        self.__database_url = database_url

    def run_cli(self) -> None:
        cmd = CommandLine(prog="alembic")
        options = cmd.parser.parse_args(sys.argv[1:])
        if not hasattr(options, "cmd"):
            cmd.parser.error("too few arguments")

        config = self._config_with_logger(
            self._config_with_defaults(
                Config(ini_section=options.name, cmd_opts=options)
            )
        )
        config.set_main_option("sqlalchemy.url", self.__database_url)
        return cmd.run_cmd(config, options)

    def _config_with_defaults(self, config: Config) -> Config:
        config.set_main_option("script_location", str(_CURRENT_DIR / "alembic"))
        config.set_main_option("version_locations", str(_CURRENT_DIR / "migrations"))
        config.set_main_option("output_encoding", "utf-8")
        config.set_main_option(
            "file_template",
            "%%(year)d_%%(month).2d_%%(day).2d_%%(hour).2d%%(minute).2d-%%(rev)s_%%(slug)s",
        )
        config.set_main_option("timezone", "UTC")
        return config

    def _config_with_logger(self, config: Config) -> Config:
        config.set_section_option("loggers", "keys", "root,sqlalchemy,alembic")
        config.set_section_option("handlers", "keys", "console")
        config.set_section_option("formatters", "keys", "generic")

        config.set_section_option("logger_root", "level", "WARNING")
        config.set_section_option("logger_root", "handlers", "console")
        config.set_section_option("logger_root", "qualname", "")

        config.set_section_option("logger_sqlalchemy", "level", "WARNING")
        config.set_section_option("logger_sqlalchemy", "handlers", "")
        config.set_section_option("logger_sqlalchemy", "qualname", "sqlalchemy.engine")

        config.set_section_option("logger_alembic", "level", "INFO")
        config.set_section_option("logger_alembic", "handlers", "")
        config.set_section_option("logger_alembic", "qualname", "alembic")

        config.set_section_option("handler_console", "class", "StreamHandler")
        config.set_section_option("handler_console", "args", "(sys.stderr,)")
        config.set_section_option("handler_console", "level", "NOTSET")
        config.set_section_option("handler_console", "formatter", "generic")

        config.set_section_option(
            "formatter_generic", "format", "%%(levelname)-5.5s [%%(name)s] %%(message)s"
        )
        config.set_section_option("formatter_generic", "datefmt", "%%H:%%M:%%S")
        return config
