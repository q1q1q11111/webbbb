import os
import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Any, List, Optional
import re

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///canteen.db")
USE_POSTGRESQL = DATABASE_URL.startswith("postgresql://")


class AsyncpgCursor:
    def __init__(self, conn: asyncpg.Connection, sql: str, params: tuple):
        self._conn = conn
        self._sql = sql
        self._params = params
        self._rows: List[asyncpg.Record] = []
        self._pos = 0
        self._executed = False

    async def _ensure_executed(self):
        if not self._executed:
            if self._sql.strip().upper().startswith("SELECT") or self._sql.strip().upper().startswith("WITH"):
                self._rows = await self._conn.fetch(self._sql, *self._params)
            else:
                await self._conn.execute(self._sql, *self._params)
            self._executed = True

    async def fetchone(self) -> Optional[asyncpg.Record]:
        await self._ensure_executed()
        if self._pos < len(self._rows):
            row = self._rows[self._pos]
            self._pos += 1
            return row
        return None

    async def fetchall(self) -> List[asyncpg.Record]:
        await self._ensure_executed()
        return self._rows


class AsyncpgConnectionWrapper:
    def __init__(self, pg_conn: asyncpg.Connection):
        self._pg = pg_conn
        self.row_factory = None

    def execute(self, sql: str, params: tuple = ()) -> AsyncpgCursor:
        converted_sql = self._convert_placeholders(sql)
        return AsyncpgCursor(self._pg, converted_sql, params)

    def _convert_placeholders(self, sql: str) -> str:
        result = []
        in_single = False
        in_double = False
        count = 0
        i = 0
        while i < len(sql):
            ch = sql[i]
            if ch == "'" and not in_double:
                in_single = not in_single
                result.append(ch)
            elif ch == '"' and not in_single:
                in_double = not in_double
                result.append(ch)
            elif ch == '?' and not in_single and not in_double:
                count += 1
                result.append(f'${count}')
            else:
                result.append(ch)
            i += 1
        return ''.join(result)

    async def commit(self):
        pass

    async def close(self):
        await self._pg.close()


@asynccontextmanager
async def get_db():
    if USE_POSTGRESQL:
        pg_conn = await asyncpg.connect(DATABASE_URL)
        wrapper = AsyncpgConnectionWrapper(pg_conn)
        try:
            yield wrapper
        finally:
            await wrapper.close()
    else:
        import aiosqlite
        db_path = DATABASE_URL.replace("sqlite:///", "")
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = aiosqlite.Row
            yield conn


async def init_db():
    if USE_POSTGRESQL:
        await _init_postgresql()
    else:
        await _init_sqlite()


async def _init_sqlite():
    import aiosqlite
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        print(f"[init_db] 新建 SQLite 数据库：{db_path}")
        async with aiosqlite.connect(db_path) as conn:
            schema_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "db", "schema_sqlite.sql"
            )
            if os.path.exists(schema_path):
                with open(schema_path, "r", encoding="utf-8") as f:
                    sql = f.read()
                for stmt in sql.split(";"):
                    stmt = stmt.strip()
                    if stmt:
                        await conn.execute(stmt)
                await conn.commit()
                print("[init_db] SQLite 数据库初始化完成")


async def _init_postgresql():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
        if not table_exists:
            print("[init_db] 新建 PostgreSQL 数据库")
            schema_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "app", "db", "schema_postgresql.sql"
            )
            if os.path.exists(schema_path):
                with open(schema_path, "r", encoding="utf-8") as f:
                    sql = f.read()
                for stmt in sql.split(";"):
                    stmt = stmt.strip()
                    if stmt:
                        await conn.execute(stmt)
                print("[init_db] PostgreSQL 数据库初始化完成")
    finally:
        await conn.close()
