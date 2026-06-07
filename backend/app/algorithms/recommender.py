"""
推荐算法模块 v2
三大策略：智能营养组合 + 用户偏好向量学习 + 协同过滤
"""

import random
import math
from collections import defaultdict
from typing import List, Tuple, Dict, Optional


# ── 营养目标（每餐）─────────────────────────────────────
TARGET = {
    "calories_min": 400,
    "calories_max": 900,
    "protein_min": 15,   # 克
    "protein_max": 60,
    "fat_max": 40,
    "carbs_min": 40,
    "carbs_max": 130,
}

# 标签权重（用于偏好学习）
TASTE_TAGS = {"酸甜", "酸辣", "麻辣", "清淡", "微辣", "中辣", "重辣", "蒜香", "酱香", "咖喱"}
NOURISH_TAGS = {"高蛋白", "低脂", "高纤维", "补充维生素", "补铁", "补钙"}
ALL_LEARNABLE_TAGS = list(TASTE_TAGS | NOURISH_TAGS)


# ── 公开接口 ─────────────────────────────────────────────────
async def recommend_for_user(db, user_id: int, budget: float = 0, top_n: int = 6) -> list:
    """
    为指定用户生成推荐方案。
    返回: [{"dish_ids", "dishes", "total_price", "total_calories",
              "total_protein", "total_fat", "total_carbs", "score", "reasons"}, ...]
    """
    pref = await _get_pref(db, user_id)
    feedback = await _get_feedback(db, user_id)
    liked_ids = [f["dish_id"] for f in feedback if f["action"] == "like"]
    skipped_ids = set(f["dish_id"] for f in feedback if f["action"] == "skip")

    # 拉取菜品（已过滤忌口/预算/饮食类型）
    dishes = await _fetch_dishes(db, pref, budget, skipped_ids)
    if not dishes:
        return []

    # 拉取所有用户反馈（用于协同过滤）
    all_feedback = await _get_all_feedback(db)

    # 生成候选组合
    plans = _generate_smart_plans(dishes, budget, pref, liked_ids, all_feedback, user_id)

    # 打分排序
    scored = [(p, _score_plan_v2(p, liked_ids, pref, user_id, all_feedback, db)) for p in plans]
    scored.sort(key=lambda x: x[1], reverse=True)

    # 组装返回
    results = []
    for plan, score in scored[:top_n]:
        total_price  = round(sum(d["price"] for d in plan), 2)
        total_cal    = sum(d["calories"] or 0 for d in plan)
        total_prot   = round(sum(d["protein"]  or 0 for d in plan), 1)
        total_fat    = round(sum(d["fat"]      or 0 for d in plan), 1)
        total_carbs  = round(sum(d["carbs"]    or 0 for d in plan), 1)
        reasons      = _explain_recommendation(plan, pref, liked_ids)
        results.append({
            "dish_ids":      [d["id"] for d in plan],
            "dishes":         [dict(d) for d in plan],
            "total_price":    total_price,
            "total_calories": total_cal,
            "total_protein":  total_prot,
            "total_fat":      total_fat,
            "total_carbs":    total_carbs,
            "score":          round(score, 2),
            "reasons":        reasons,
        })
    return results


# ── 数据获取 ─────────────────────────────────────────────────
async def _get_pref(db, user_id: int) -> Optional[dict]:
    cur = db.execute("SELECT * FROM user_preferences WHERE user_id=?", (user_id,))
    row = await cur.fetchone()
    return dict(row) if row else None


async def _get_feedback(db, user_id: int) -> list:
    cur = db.execute(
        "SELECT dish_id, action FROM user_feedback WHERE user_id=?", (user_id,)
    )
    return [dict(r) for r in await cur.fetchall()]


async def _get_all_feedback(db) -> dict:
    """返回 {user_id: {dish_id: action}} """
    cur = db.execute("SELECT user_id, dish_id, action FROM user_feedback")
    d = defaultdict(dict)
    async for row in cur:
        d[row["user_id"]][row["dish_id"]] = row["action"]
    return dict(d)


async def _fetch_dishes(db, pref, budget: float, skipped_ids: set) -> list:
    sql = "SELECT * FROM dishes WHERE is_available"
    args = []
    if pref and pref.get("allergies"):
        for a in [x.strip() for x in (pref["allergies"] or "").split(",") if x.strip()]:
            sql += " AND (tags IS NULL OR tags NOT LIKE ?)"
            args.append(f"%{a}%")
    if budget > 0:
        sql += " AND price <= ?"
        args.append(budget * 1.5)   # 允许单品略超预算，组合时再卡
    if pref and pref.get("dietary_type") == "素食":
        sql += " AND category IN ('素菜','主食','汤')"
    sql += " ORDER BY price"
    cur = db.execute(sql, tuple(args))
    rows = await cur.fetchall()
    dishes = [dict(r) for r in rows]
    return [d for d in dishes if d["id"] not in skipped_ids]


# ── 智能组合生成 ─────────────────────────────────────────────
def _generate_smart_plans(
    dishes: list, budget: float, pref, liked_ids: list,
    all_feedback: dict, user_id: int
) -> List[list]:
    """
    生成推荐组合：
    1. 确保有主食
    2. 荤素搭配合理
    3. 营养在目标区间内
    4. 利用协同过滤加入相似用户喜欢的菜品
    """
    by_cat = defaultdict(list)
    for d in dishes:
        by_cat[d["category"]].append(d)

    staples = by_cat.get("主食", [])
    meats   = by_cat.get("荤菜", [])
    veggies = by_cat.get("素菜", [])
    soups   = by_cat.get("汤", [])
    others  = by_cat.get("小吃", []) + by_cat.get("饮品", [])

    # 协同过滤：找到相似用户喜欢的菜品，提升优先级
    cf_boost_ids = _collaborative_boost(all_feedback, user_id, liked_ids)

    plans = []

    # ── 策略 A：经典搭配（主食 + 荤菜 + 素菜）────────────
    for s in staples[:6]:
        for m in _top_dishes(meats, cf_boost_ids, liked_ids)[:6]:
            for v in _top_dishes(veggies, cf_boost_ids, liked_ids)[:5]:
                combo = [s, m, v]
                if _plan_price(combo) > budget > 0:
                    continue
                if _nutrition_ok(combo):
                    plans.append(combo)

    # ── 策略 B：轻食（主食 + 素菜 + 素菜）──────────────
    for s in staples[:5]:
        for v1 in veggies[:6]:
            for v2 in veggies[:6]:
                if v1["id"] == v2["id"]:
                    continue
                combo = [s, v1, v2]
                if _plan_price(combo) > budget > 0:
                    continue
                if _nutrition_ok(combo):
                    plans.append(combo)

    # ── 策略 C：有汤搭配（主食 + 荤菜 + 汤）────────────
    for s in staples[:5]:
        for m in _top_dishes(meats, cf_boost_ids, liked_ids)[:5]:
            for sp in (soups if soups else [None])[:3]:
                combo = [s, m, sp] if sp else [s, m]
                if _plan_price(combo) > budget > 0:
                    continue
                if _nutrition_ok(combo):
                    plans.append([d for d in combo if d])

    # ── 策略 D：小吃加餐（主食 + 荤菜 + 小吃）────────────
    for s in staples[:4]:
        for m in _top_dishes(meats, cf_boost_ids, liked_ids)[:4]:
            for snack in others[:3]:
                combo = [s, m, snack]
                if _plan_price(combo) > budget > 0:
                    continue
                if _nutrition_ok(combo):
                    plans.append(combo)

    # 去重
    seen = set()
    unique = []
    for p in plans:
        key = tuple(sorted(d["id"] for d in p))
        if key not in seen:
            seen.add(key)
            unique.append(p)

    # 如果组合不够，补充随机合理组合
    if len(unique) < 6:
        extra = _fill_random(dishes, budget, liked_ids, cf_boost_ids)
        for p in extra:
            key = tuple(sorted(d["id"] for d in p))
            if key not in seen:
                seen.add(key)
                unique.append(p)

    return unique[:20]


def _top_dishes(dishes: list, cf_boost_ids: set, liked_ids: list) -> list:
    """按优先级排序：协同过滤 boost > 历史点赞 > 价格合理"""
    def _priority(d):
        score = 0
        if d["id"] in cf_boost_ids:
            score += 3
        if d["id"] in liked_ids:
            score += 2
        # 偏好价格适中的（不要太贵）
        if 5 <= d["price"] <= 18:
            score += 1
        return score
    return sorted(dishes, key=_priority, reverse=True)


def _collaborative_boost(all_feedback: dict, user_id: int, liked_ids: list) -> set:
    """
    协同过滤：找到与当前用户最相似的用户，把他点赞的菜加入 boost 集合。
    相似度 = 共同点赞菜品数 / sqrt(用户A点赞数 * 用户B点赞数)
    """
    if not liked_ids:
        return set()
    my_likes = set(liked_ids)
    best_match = None
    best_score = 0.0

    for uid, actions in all_feedback.items():
        if uid == user_id:
            continue
        other_likes = {did for did, act in actions.items() if act == "like"}
        if not other_likes:
            continue
        overlap = len(my_likes & other_likes)
        if overlap == 0:
            continue
        score = overlap / (math.sqrt(len(my_likes)) * math.sqrt(len(other_likes)))
        if score > best_score:
            best_score = score
            best_match = uid

    if best_match and best_score > 0.2:
        other_likes = {did for did, act in all_feedback[best_match].items() if act == "like"}
        # 只推荐对方喜欢、但我没点赞过的
        return other_likes - my_likes
    return set()


def _fill_random(dishes: list, budget: float, liked_ids: list, cf_boost_ids: set) -> list:
    """随机补充合理组合"""
    plans = []
    for _ in range(30):
        d = random.sample(dishes, min(3, len(dishes)))
        if _plan_price(d) <= budget or budget == 0:
            if _nutrition_ok(d):
                plans.append(d)
    return plans


# ── 营养判断 ─────────────────────────────────────────────────
def _plan_price(plan):
    return sum(d["price"] for d in plan if d)


def _nutrition_ok(plan) -> bool:
    cal  = sum(d["calories"] or 0 for d in plan)
    prot = sum(d["protein"]  or 0 for d in plan)
    fat  = sum(d["fat"]      or 0 for d in plan)
    carb = sum(d["carbs"]    or 0 for d in plan)
    # 宽松判断：只有严重超标才剔除
    if cal > 0 and (cal < 200 or cal > 1200):
        return False
    if prot > 0 and (prot < 5 or prot > 80):
        return False
    return True


# ── 打分函数 v2 ──────────────────────────────────────────────
def _score_plan_v2(plan, liked_ids, pref, user_id, all_feedback, db) -> float:
    """
    综合打分（0-10）：
    - 营养平衡性（2 分）
    - 用户偏好匹配（3 分）
    - 历史点赞匹配（2 分）
    - 价格合理性（1.5 分）
    - 协同过滤信号（1.5 分）
    """
    score = 5.0
    liked_set = set(liked_ids)

    # 1. 营养平衡性
    cal  = sum(d["calories"] or 0 for d in plan)
    prot = sum(d["protein"]  or 0 for d in plan)
    fat  = sum(d["fat"]      or 0 for d in plan)
    carb = sum(d["carbs"]    or 0 for d in plan)

    # 热量在合理区间
    if TARGET["calories_min"] <= cal <= TARGET["calories_max"]:
        score += 1.0
    elif cal < TARGET["calories_min"] * 0.7:
        score -= 1.0

    # 蛋白质充足
    if prot >= TARGET["protein_min"]:
        score += 0.5
    # 荤素都有 = 蛋白质来源合理
    cats = [d["category"] for d in plan]
    if "荤菜" in cats and "素菜" in cats:
        score += 0.5

    # 2. 用户偏好匹配（标签维度）
    if pref:
        pref_vector = _build_pref_vector(pref)
        for d in plan:
            dish_vector = _dish_to_vector(d)
            sim = _cosine_sim(pref_vector, dish_vector)
            score += sim * 1.5   # 最高 +1.5

        # 忌口已过滤，这里不重复扣分

    # 3. 历史点赞匹配
    for d in plan:
        if d["id"] in liked_set:
            score += 1.2
        # 相似菜品（同标签）也加分
        for lid in liked_set:
            # 简易判断：同名菜品不同 ID 视为相似（实际可扩展为标签相似）
            pass

    # 4. 价格合理性
    total = _plan_price(plan)
    if pref and pref.get("budget"):
        b = float(pref["budget"])
        ratio = total / b if b > 0 else 0
        if 0.5 <= ratio <= 0.9:
            score += 1.0
        elif ratio < 0.3:
            score -= 0.5   # 太便宜可能吃不饱
        elif ratio > 1.1:
            score -= 0.8   # 超预算

    # 5. 协同过滤信号
    cf_boost = _collaborative_boost(all_feedback, user_id, liked_ids)
    for d in plan:
        if d["id"] in cf_boost:
            score += 1.0

    # 6. 多样性奖励：方案中包含不同 category 的菜品
    unique_cats = set(d["category"] for d in plan)
    if len(unique_cats) >= 3:
        score += 0.5

    return max(0.0, min(10.0, score))


def _build_pref_vector(pref) -> dict:
    """从用户偏好表构建标签向量"""
    v = {}
    for tag in ALL_LEARNABLE_TAGS:
        v[tag] = 0.0
    # 从 spicy_level 推断
    sl = pref.get("spicy_level") or 0
    if sl == 0:
        v["清淡"] = 1.0
    elif sl == 1:
        v["微辣"] = 1.0
        v["酸甜"] = 0.5
    elif sl == 2:
        v["中辣"] = 1.0
        v["酸辣"] = 0.8
    else:
        v["重辣"] = 1.0
        v["麻辣"] = 0.8

    if pref.get("sweet_preference"):
        v["酸甜"] = 1.0
    if pref.get("sour_preference"):
        v["酸辣"] = 1.0
    return v


def _dish_to_vector(dish) -> dict:
    """将菜品 tags 转为向量"""
    v = {}
    for tag in ALL_LEARNABLE_TAGS:
        v[tag] = 0.0
    tags = [t.strip() for t in (dish.get("tags") or "").split(",") if t.strip()]
    for t in tags:
        if t in v:
            v[t] = 1.0
    # 从 category 推断
    cat = dish.get("category", "")
    if cat == "荤菜":
        v["补铁"] = 0.3
        v["高蛋白"] = 0.5
    elif cat == "素菜":
        v["高纤维"] = 0.5
        v["补充维生素"] = 0.5
    return v


def _cosine_sim(a: dict, b: dict) -> float:
    dot = sum(a[k] * b[k] for k in a)
    na = math.sqrt(sum(v*v for v in a.values()))
    nb = math.sqrt(sum(v*v for v in b.values()))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


# ── 推荐理由 ─────────────────────────────────────────────────
def _explain_recommendation(plan, pref, liked_ids: list) -> list:
    """生成推荐理由（前端展示用）"""
    reasons = []
    liked_set = set(liked_ids)
    cats = [d["category"] for d in plan]
    cal = sum(d["calories"] or 0 for d in plan)
    prot = sum(d["protein"] or 0 for d in plan)

    if "荤菜" in cats and "素菜" in cats:
        reasons.append("荤素搭配，营养均衡")
    if TARGET["calories_min"] <= cal <= TARGET["calories_max"]:
        reasons.append(f"热量约 {cal} kcal，适中")
    if prot >= TARGET["protein_min"]:
        reasons.append(f"蛋白质 {prot:.0f}g，营养充足")
    for d in plan:
        if d["id"] in liked_set:
            reasons.append(f"包含你点赞过的「{d['name']}」")
            break
    total = sum(d["price"] for d in plan)
    if pref and pref.get("budget"):
        b = float(pref["budget"])
        if total <= b * 0.9:
            reasons.append(f"价格在预算内（¥{total:.0f}/{b:.0f}）")
    if not reasons:
        reasons.append("综合评分最高的搭配方案")
    return reasons[:3]
