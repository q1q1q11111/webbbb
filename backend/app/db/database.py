import os
import asyncpg
from contextlib import asynccontextmanager
from typing import AsyncGenerator

# 支持 SQLite（本地开发）和 PostgreSQL（生产环境）
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///canteen.db")

# 判断数据库类型
USE_POSTGRESQL = DATABASE_URL.startswith("postgresql://")


@asynccontextmanager
async def get_db() -> AsyncGenerator:
    """FastAPI dependency — yields a connection for a single request."""
    if USE_POSTGRESQL:
        conn = await asyncpg.connect(DATABASE_URL)
        try:
            yield conn
        finally:
            await conn.close()
    else:
        # SQLite 本地开发
        import aiosqlite
        db_path = DATABASE_URL.replace("sqlite:///", "")
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = aiosqlite.Row
            yield conn


async def init_db():
    """Create tables & seed data if the database is new."""
    if USE_POSTGRESQL:
        await _init_postgresql()
    else:
        await _init_sqlite()


async def _init_sqlite():
    """Initialize SQLite database."""
    import aiosqlite
    db_path = DATABASE_URL.replace("sqlite:///", "")
    
    # 检查数据库文件是否存在
    if not os.path.exists(db_path):
        print(f"[init_db] 新建 SQLite 数据库：{db_path}")
        async with aiosqlite.connect(db_path) as conn:
            conn.row_factory = aiosqlite.Row
            # 执行 schema.sql（SQLite 版本）
            schema_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "db",
                "schema_sqlite.sql"
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
    else:
        print(f"[init_db] SQLite 数据库已存在：{db_path}，跳过初始化")


async def _init_postgresql():
    """Initialize PostgreSQL database."""
    # 检查表是否存在
    conn = await asyncpg.connect(DATABASE_URL)
    try:
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
        )
        
        if not table_exists:
            print("[init_db] 新建 PostgreSQL 数据库")
            # 执行 schema.sql（PostgreSQL 版本）
            schema_path = os.path.join(
                os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                "db",
                "schema_postgresql.sql"
            )
            if os.path.exists(schema_path):
                with open(schema_path, "r", encoding="utf-8") as f:
                    sql = f.read()
                # 按语句执行
                for stmt in sql.split(";"):
                    stmt = stmt.strip()
                    if stmt:
                        await conn.execute(stmt)
                print("[init_db] PostgreSQL 数据库初始化完成")
        else:
            print("[init_db] PostgreSQL 数据库已存在，跳过初始化")
    finally:
        await conn.close()
