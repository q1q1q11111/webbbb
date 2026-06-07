from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.db.database import get_db

router = APIRouter()


class DishIn(BaseModel):
    name: str
    canteen_id: int
    price: float
    calories: int = 0
    protein: float = 0
    fat: float = 0
    carbs: float = 0
    category: str = "荤菜"
    tags: str = ""
    description: str = ""


class DishUpdate(BaseModel):
    name: str = ""
    price: float = -1
    calories: int = -1
    protein: float = -1
    fat: float = -1
    carbs: float = -1
    category: str = ""
    tags: str = ""
    description: str = ""
    is_available: bool = None


@router.get("/canteens")
async def list_canteens(db:= Depends(get_db)):
    """获取所有食堂列表"""
    cursor = await db.execute("SELECT * FROM canteens ORDER BY id")
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/list")
async def list_dishes(
    canteen_id: int = 0,
    category: str = "",
    keyword: str = "",
    max_price: float = 0,
    db:= Depends(get_db)
):
    sql = "SELECT d.*, c.name AS canteen_name FROM dishes d JOIN canteens c ON d.canteen_id=c.id WHERE d.is_available=1"
    args: list = []
    if canteen_id:
        sql += " AND d.canteen_id=?"
        args.append(canteen_id)
    if category:
        sql += " AND d.category=?"
        args.append(category)
    if keyword:
        sql += " AND d.name LIKE ?"
        args.append(f"%{keyword}%")
    if max_price:
        sql += " AND d.price <= ?"
        args.append(max_price)
    sql += " ORDER BY d.price"
    cursor = await db.execute(sql, tuple(args))
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/add")
async def add_dish(req: DishIn, db: = Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO dishes (name, canteen_id, price, calories, protein, fat, carbs, category, tags, description) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (req.name, req.canteen_id, req.price, req.calories, req.protein, req.fat, req.carbs, req.category, req.tags, req.description)
    )
    await db.commit()
    return {"id": cursor.lastrowid, "msg": "菜品添加成功"}


@router.put("/update")
async def update_dish(dish_id: int, req: DishUpdate, db: = Depends(get_db)):
    fields = []
    args = []
    for col, val in [
        ("name", req.name), ("price", req.price), ("calories", req.calories),
        ("protein", req.protein), ("fat", req.fat), ("carbs", req.carbs),
        ("category", req.category), ("tags", req.tags), ("description", req.description)
    ]:
        if col == "price" and val == -1:
            continue
        if val != -1 and val != "":
            fields.append(f"{col}=?")
            args.append(val)
    if req.is_available is not None:
        fields.append("is_available=?")
        args.append(1 if req.is_available else 0)
    if not fields:
        return {"error": "没有可更新的字段"}
    args.append(dish_id)
    await db.execute(f"UPDATE dishes SET {','.join(fields)} WHERE id=?", tuple(args))
    await db.commit()
    return {"msg": "菜品更新成功"}


@router.delete("/delete")
async def delete_dish(dish_id: int, db: = Depends(get_db)):
    await db.execute("UPDATE dishes SET is_available=0 WHERE id=?", (dish_id,))
    await db.commit()
    return {"msg": "菜品已隐藏"}
