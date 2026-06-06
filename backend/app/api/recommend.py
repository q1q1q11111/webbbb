from fastapi import APIRouter, Depends
from aiosqlite import Connection
from app.db.database import get_db
from app.algorithms.recommender import recommend_for_user

router = APIRouter()

@router.get("/for_user")
async def get_recommendation(
    user_id: int,
    budget: float = 0,
    db: Connection = Depends(get_db)
):
    if budget <= 0:
        cursor = await db.execute("SELECT budget FROM user_preferences WHERE user_id=?", (user_id,))
        row = await cursor.fetchone()
        budget = row[0] if row and row[0] else 0

    results = await recommend_for_user(db, user_id, budget)
    return {"plans": results}


@router.get("/history")
async def get_history(user_id: int, db: Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT * FROM recommendation_history WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
        (user_id,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
