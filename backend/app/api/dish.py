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
async def list_canteens(db = Depends(get_db)):
    """获取所有食堂列表"""
    cursor = db.execute("SELECT * FROM canteens ORDER BY id")
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.get("/menu")
async def today_menu(user_id: int = 0, db = Depends(get_db)):
    """获取今日菜单：按食堂分组展示所有可点菜品，含点赞数和当前用户是否已点赞"""
    # 获取所有食堂
    canteens_cursor = db.execute("SELECT * FROM canteens ORDER BY id")
    canteens_rows = await canteens_cursor.fetchall()
    canteens = [dict(r) for r in canteens_rows]

    # 获取所有可点菜品
    dishes_cursor = db.execute(
        "SELECT d.*, c.name AS canteen_name FROM dishes d JOIN canteens c ON d.canteen_id=c.id WHERE d.is_available ORDER BY d.canteen_id, d.price"
    )
    dishes_rows = await dishes_cursor.fetchall()

    # 获取每条菜品的点赞数
    like_counts = {}
    for d in dishes_rows:
        lc = db.execute(
            "SELECT COUNT(*) FROM user_feedback WHERE dish_id=? AND action='like'",
            (d["id"],)
        )
        row = await lc.fetchone()
        like_counts[d["id"]] = row[0] if row else 0

    # 如果用户已登录，获取该用户点赞过的菜品 ID 列表
    liked_ids = set()
    if user_id:
        liked_cursor = db.execute(
            "SELECT dish_id FROM user_feedback WHERE user_id=? AND action='like'",
            (user_id,)
        )
        liked_rows = await liked_cursor.fetchall()
        liked_ids = {r["dish_id"] for r in liked_rows}

    # 按食堂分组
    result = []
    for canteen in canteens:
        canteen_dishes = []
        for d in dishes_rows:
            if d["canteen_id"] == canteen["id"]:
                dish_dict = dict(d)
                dish_dict["like_count"] = like_counts.get(d["id"], 0)
                dish_dict["is_liked"] = d["id"] in liked_ids
                canteen_dishes.append(dish_dict)
        result.append({
            **canteen,
            "dishes": canteen_dishes
        })

    return result


@router.get("/list")
async def list_dishes(
    canteen_id: int = 0,
    category: str = "",
    keyword: str = "",
    max_price: float = 0,
    db = Depends(get_db)
):
    sql = "SELECT d.*, c.name AS canteen_name FROM dishes d JOIN canteens c ON d.canteen_id=c.id WHERE d.is_available"
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
    cursor = db.execute(sql, tuple(args))
    rows = await cursor.fetchall()
    return [dict(r) for r in rows]


@router.post("/add")
async def add_dish(req: DishIn, db = Depends(get_db)):
    cursor = db.execute(
        "INSERT INTO dishes (name, canteen_id, price, calories, protein, fat, carbs, category, tags, description) VALUES (?,?,?,?,?,?,?,?,?,?)",
        (req.name, req.canteen_id, req.price, req.calories, req.protein, req.fat, req.carbs, req.category, req.tags, req.description)
    )
    await db.commit()
    return {"id": cursor.lastrowid, "msg": "菜品添加成功"}


@router.put("/update")
async def update_dish(dish_id: int, req: DishUpdate, db = Depends(get_db)):
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
    db.execute(f"UPDATE dishes SET {','.join(fields)} WHERE id=?", tuple(args))
    await db.commit()
    return {"msg": "菜品更新成功"}


@router.delete("/delete")
async def delete_dish(dish_id: int, db = Depends(get_db)):
    db.execute("UPDATE dishes SET is_available=? WHERE id=?", (0, dish_id))
    await db.commit()
    return {"msg": "菜品已隐藏"}
