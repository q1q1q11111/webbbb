import os
import asyncpg
from typing import Any, List, Optional

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///canteen.db")
USE_POSTGRESQL = DATABASE_URL.startswith("postgresql://")


class AsyncpgCursor:
    """模拟 aiosqlite cursor，用于 PostgreSQL"""
    
    def __init__(self, conn: asyncpg.Connection, sql: str, params: tuple):
        self._conn = conn
        self._sql = sql
        self._params = params
        self._rows: List[asyncpg.Record] = []
        self._pos = 0
        self._executed = False
    
    async def _ensure_executed(self):
        if not self._executed:
            if self._sql.strip().upper().startswith("SELECT") or \
               self._sql.strip().upper().startswith("WITH") or \
               "RETURNING" in self._sql.upper():
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


class DBConnection:
    """统一的数据库连接包装层 - 使用类而非 @asynccontextmanager 解决 Python 3.11 兼容性"""
    
    def __init__(self):
        self._conn = None
        self._is_postgres = USE_POSTGRESQL
        self.row_factory = None
        self.lastrowid = None
    
    async def __aenter__(self):
        if self._is_postgres:
            pg_conn = await asyncpg.connect(DATABASE_URL)
            self._conn = pg_conn
            return self
        else:
            import aiosqlite
            db_path = DATABASE_URL.replace("sqlite:///", "")
            conn = await aiosqlite.connect(db_path)
            conn.row_factory = aiosqlite.Row
            self._conn = conn
            return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self._conn:
            if self._is_postgres:
                await self._conn.close()
            else:
                await self._conn.close()
    
    def execute(self, sql: str, params: tuple = ()) -> AsyncpgCursor:
        if self._is_postgres:
            converted_sql = self._convert_placeholders(sql)
            return AsyncpgCursor(self._conn, converted_sql, params)
        else:
            # SQLite 模式下直接调用原生方法
            import asyncio
            # 返回一个包装对象让调用方用 await
            return SQLiteCursorWrapper(self._conn, sql, params)
    
    async def commit(self):
        if self._is_postgres:
            pass  # PostgreSQL 默认自动提交事务
        else:
            await self._conn.commit()
    
    async def close(self):
        if self._conn:
            if self._is_postgres:
                await self._conn.close()
            else:
                await self._conn.close()
    
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
    """SQLite 模式下的 cursor 包装器"""
    
    def __init__(self, conn, sql: str, params: tuple):
        self._conn = conn
        self._sql = sql
        self._params = params
        self._cursor = None
        self._lastrowid = None
    
    async def _ensure_cursor(self):
        if not self._cursor:
            self._cursor = await self._conn.execute(self._sql, self._params)
            self._lastrowid = self._cursor.lastrowid
    
    @property
    def lastrowid(self):
        return self._lastrowid
    
    async def fetchone(self):
        await self._ensure_cursor()
        return await self._cursor.fetchone()
    
    async def fetchall(self):
        await self._ensure_cursor()
        return await self._cursor.fetchall()


def get_db():
    """返回数据库连接上下文管理器实例（用于 FastAPI Depends）"""
    return DBConnection()


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
