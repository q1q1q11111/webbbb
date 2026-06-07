from fastapi import APIRouter, Depends
from app.db.database import get_db
from app.algorithms.recommender import recommend_for_user

router = APIRouter()

@router.get("/for_user")
async def get_recommendation(
    user_id: int,
    budget: float = 0,
    db = Depends(get_db)
):
    if budget <= 0:
        cursor = db.execute("SELECT budget FROM user_preferences WHERE user_id=?", (user_id,))
        row = await cursor.fetchone()
        budget = row[0] if row and row[0] else 0

    results = await recommend_for_user(db, user_id, budget)
    return {"plans": results}


@router.post("/save_history")
async def save_history(
    user_id: int,
    dish_ids: str,
    total_price: float,
    total_calories: int,
    total_protein: float,
    total_fat: float = 0,
    total_carbs: float = 0,
    score: float = 0,
    db = Depends(get_db)
):
    await db.execute(
        """INSERT INTO recommendation_history
           (user_id, dish_ids, total_price, total_calories, total_protein, total_fat, total_carbs, score)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (user_id, dish_ids, total_price, total_calories, total_protein, total_fat, total_carbs, score)
    )
    await db.commit()
    return {"success": True}


@router.get("/history")
async def get_history(user_id: int, db = Depends(get_db)):
    cursor = db.execute(
        "SELECT * FROM recommendation_history WHERE user_id=? ORDER BY created_at DESC LIMIT 20",
        (user_id,)
    )
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]
