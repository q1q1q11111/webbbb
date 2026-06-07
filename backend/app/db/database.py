import os
import asyncpg
from typing import Any, List, Optional

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///canteen.db")
USE_POSTGRESQL = DATABASE_URL.startswith("postgresql://")


class AsyncpgCursor:
    """统一的 cursor 包装器，同时支持 SELECT 和 INSERT/UPDATE/DELETE"""

    def __init__(self, conn, sql: str, params: tuple):
        self._conn = conn
        self._sql = sql
        self._params = params
        self._rows: List[Any] = []
        self._pos = 0
        self._executed = False

    async def execute_now(self):
        """立即执行 SQL（用于 commit 时批量刷新）"""
        if not self._executed:
            if self._is_query():
                self._rows = await self._conn.fetch(self._sql, *self._params)
            else:
                await self._conn.execute(self._sql, *self._params)
            self._executed = True

    async def _ensure_executed(self):
        await self.execute_now()

    def _is_query(self) -> bool:
        upper = self._sql.strip().upper()
        return upper.startswith("SELECT") or upper.startswith("WITH") or "RETURNING" in upper

    async def fetchone(self) -> Optional[Any]:
        await self._ensure_executed()
        if self._pos < len(self._rows):
            row = self._rows[self._pos]
            self._pos += 1
            return row
        return None

    async def fetchall(self) -> List[Any]:
        await self._ensure_executed()
        return self._rows


class DBConnection:
    def __init__(self):
        self._conn = None
        self._is_postgres = USE_POSTGRESQL
        self._sqlite_conn = None
        self._pending_writes: List[AsyncpgCursor] = []
        self.row_factory = None
        self.lastrowid = None

    async def __aenter__(self):
        if self._is_postgres:
            self._conn = await asyncpg.connect(DATABASE_URL)
            return self
        else:
            import aiosqlite
            db_path = DATABASE_URL.replace("sqlite:///", "")
            self._sqlite_conn = await aiosqlite.connect(db_path)
            self._sqlite_conn.row_factory = aiosqlite.Row
            self._conn = self._sqlite_conn
            return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._is_postgres:
            if self._conn:
                await self._conn.close()
        else:
            if self._sqlite_conn:
                await self._sqlite_conn.close()

    def execute(self, sql: str, params: tuple = ()) -> AsyncpgCursor:
        if self._is_postgres:
            converted_sql = self._convert_placeholders(sql)
            cursor = AsyncpgCursor(self._conn, converted_sql, params)
            # SELECT 查询：延迟执行（fetchone/fetchall 时执行）
            # INSERT/UPDATE/DELETE：放入待执行队列，commit 时批量执行
            if not cursor._is_query():
                self._pending_writes.append(cursor)
            return cursor
        else:
            import asyncio
            coro = self._sqlite_conn.execute(sql, params)
            loop = asyncio.get_event_loop()
            return SQLiteCursorWrapper(coro)

    async def commit(self):
        if self._is_postgres:
            # ⭐ 执行所有待处理的 INSERT/UPDATE/DELETE
            for cursor in self._pending_writes:
                await cursor.execute_now()
            self._pending_writes.clear()
        else:
            await self._sqlite_conn.commit()

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


class SQLiteCursorWrapper:
    def __init__(self, coro):
        self._coro = coro
        self._cursor = None
        self._lastrowid = None

    async def _ensure(self):
        if self._cursor is None:
            self._cursor = await self._coro
            self._lastrowid = self._cursor.lastrowid

    @property
    def lastrowid(self):
        return self._lastrowid

    async def fetchone(self):
        await self._ensure()
        return await self._cursor.fetchone()

    async def fetchall(self):
        await self._ensure()
        return await self._cursor.fetchall()


# ⭐ FastAPI 依赖注入
async def get_db():
    db = DBConnection()
    async with db:
        yield db


# ========== 初始化 ==========

async def init_db():
    if USE_POSTGRESQL:
        await _init_postgresql()
    else:
        await _init_sqlite()


async def _init_sqlite():
    import aiosqlite
    db_path = DATABASE_URL.replace("sqlite:///", "")
    if not os.path.exists(db_path):
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = aiosqlite.Row
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


async def _init_postgresql():
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
        if not table_exists:
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
    finally:
        await conn.close()
