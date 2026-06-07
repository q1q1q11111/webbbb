from fastapi import APIRouter, Depends
from app.db.database import get_db

router = APIRouter()


@router.get("/like_count")
async def like_count(user_id: int, db = Depends(get_db)):
    """获取用户点赞数量"""
    cursor = db.execute(
        "SELECT COUNT(*) FROM user_feedback WHERE user_id=? AND action='like'",
        (user_id,)
    )
    row = await cursor.fetchone()
    return {"count": row[0] if row else 0}


@router.post("/like")
async def like_dish(user_id: int, dish_id: int, db = Depends(get_db)):
    # SQLite 兼容写法：先删后插
    db.execute(
        "DELETE FROM user_feedback WHERE user_id=? AND dish_id=?",
        (user_id, dish_id)
    )
    db.execute(
        "INSERT INTO user_feedback (user_id, dish_id, action) VALUES (?,?,?)",
        (user_id, dish_id, "like")
    )
    await db.commit()
    return {"msg": "已标记喜欢"}


@router.post("/skip")
async def skip_dish(user_id: int, dish_id: int, db = Depends(get_db)):
    db.execute(
        "DELETE FROM user_feedback WHERE user_id=? AND dish_id=?",
        (user_id, dish_id)
    )
    db.execute(
        "INSERT INTO user_feedback (user_id, dish_id, action) VALUES (?,?,?)",
        (user_id, dish_id, "skip")
    )
    await db.commit()
    return {"msg": "已标记不喜欢"}
