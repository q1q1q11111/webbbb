from fastapi import APIRouter, Depends
from aiosqlite import Connection
from pydantic import BaseModel
from app.db.database import get_db

router = APIRouter()


class RegisterIn(BaseModel):
    username: str
    password: str
    nickname: str = ""


class LoginIn(BaseModel):
    username: str
    password: str


class PreferencesIn(BaseModel):
    dietary_type: str = ""
    allergies: str = ""
    spicy_level: int = 0
    sweet_preference: bool = False
    sour_preference: bool = False
    budget: float = 0


@router.post("/register")
async def register(req: RegisterIn, db: Connection = Depends(get_db)):
    pw_hash = req.password  # 简化，实际应加密
    cursor = await db.execute(
        "INSERT INTO users (username, password_hash, nickname) VALUES (?,?,?)",
        (req.username, pw_hash, req.nickname or req.username)
    )
    await db.commit()
    row = await (await db.execute("SELECT id FROM users WHERE username=?", (req.username,))).fetchone()
    return {"user_id": row[0], "msg": "注册成功"}


@router.post("/login")
async def login(req: LoginIn, db: Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, nickname FROM users WHERE username=? AND password_hash=?",
        (req.username, req.password)
    )
    row = await cursor.fetchone()
    if not row:
        return {"error": "用户名或密码错误"}
    return {"user_id": row[0], "nickname": row[1], "msg": "登录成功"}


@router.get("/profile")
async def get_profile(user_id: int, db: Connection = Depends(get_db)):
    cursor = await db.execute("SELECT * FROM user_preferences WHERE user_id=?", (user_id,))
    row = await cursor.fetchone()
    return dict(row) if row else {}


@router.get("/preferences")
async def get_preferences(user_id: int, db: Connection = Depends(get_db)):
    """获取用户偏好设置"""
    cursor = await db.execute("SELECT * FROM user_preferences WHERE user_id=?", (user_id,))
    row = await cursor.fetchone()
    return dict(row) if row else {}


@router.post("/preferences")
async def save_preferences(req: PreferencesIn, user_id: int = None, db: Connection = Depends(get_db)):
    await db.execute("DELETE FROM user_preferences WHERE user_id=?", (user_id,))
    await db.execute(
        "INSERT INTO user_preferences (user_id, dietary_type, allergies, spicy_level, sweet_preference, sour_preference, budget) VALUES (?,?,?,?,?,?,?)",
        (user_id, req.dietary_type, req.allergies, req.spicy_level, req.sweet_preference, req.sour_preference, req.budget)
    )
    await db.commit()
    return {"msg": "偏好保存成功"}
