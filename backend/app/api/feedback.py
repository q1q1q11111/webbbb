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


@router.get("/dish_like_count")
async def dish_like_count(dish_id: int, db = Depends(get_db)):
    """获取某个菜品的点赞数"""
    cursor = db.execute(
        "SELECT COUNT(*) FROM user_feedback WHERE dish_id=? AND action='like'",
        (dish_id,)
    )
    row = await cursor.fetchone()
    return {"count": row[0] if row else 0}


@router.get("/liked_dishes")
async def liked_dishes(user_id: int, db = Depends(get_db)):
    """获取用户收藏的所有菜品"""
    cursor = db.execute(
        """SELECT d.*, c.name AS canteen_name
           FROM user_feedback uf
           JOIN dishes d ON uf.dish_id = d.id
           JOIN canteens c ON d.canteen_id = c.id
           WHERE uf.user_id=? AND uf.action='like'
           ORDER BY uf.created_at DESC""",
        (user_id,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/like")
async def like_dish(user_id: int, dish_id: int, db = Depends(get_db)):
    # 先删后插（兼容 upsert）
    db.execute(
        "DELETE FROM user_feedback WHERE user_id=? AND dish_id=?",
        (user_id, dish_id)
    )
    db.execute(
        "INSERT INTO user_feedback (user_id, dish_id, action) VALUES (?,?,?)",
        (user_id, dish_id, "like")
    )
    await db.commit()
    return {"msg": "已点赞", "liked": True}


@router.delete("/unlike")
async def unlike_dish(user_id: int, dish_id: int, db = Depends(get_db)):
    """取消点赞"""
    db.execute(
        "DELETE FROM user_feedback WHERE user_id=? AND dish_id=? AND action='like'",
        (user_id, dish_id)
    )
    await db.commit()
    return {"msg": "已取消点赞", "liked": False}


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
