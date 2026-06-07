import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { dishAPI, feedbackAPI, Dish } from "../api/client";

interface MenuDish extends Dish {
  like_count: number;
  is_liked: boolean;
}

interface CanteenGroup {
  id: number;
  name: string;
  location: string;
  description: string;
  dishes: MenuDish[];
}

export default function Menu() {
  const userId = parseInt(localStorage.getItem("user_id") || "0");
  const [canteens, setCanteens] = useState<CanteenGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [toast, setToast] = useState("");

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await dishAPI.menu(userId);
      setCanteens(res.data);
    } catch (e: any) {
      console.error("加载菜单失败", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadMenu(); }, [userId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const handleLike = async (dish: MenuDish) => {
    if (!userId) {
      showToast("请先登录再收藏哦~");
      return;
    }
    try {
      if (dish.is_liked) {
        await feedbackAPI.unlike(userId, dish.id);
        dish.is_liked = false;
        dish.like_count = Math.max(0, dish.like_count - 1);
        showToast("已取消收藏");
      } else {
        await feedbackAPI.like(userId, dish.id);
        dish.is_liked = true;
        dish.like_count += 1;
        showToast("❤️ 已收藏");
      }
      setCanteens([...canteens]);
    } catch (e: any) {
      showToast("操作失败，请重试");
    }
  };

  const categoryEmoji: Record<string, string> = {
    "荤菜": "🥩", "素菜": "🥬", "汤": "🍲", "主食": "🍚", "小吃": "🍢", "饮品": "🥤",
  };
  const categoryBg: Record<string, string> = {
    "荤菜": "bg-red-100 text-red-700",
    "素菜": "bg-green-100 text-green-700",
    "汤": "bg-yellow-100 text-yellow-700",
    "主食": "bg-blue-100 text-blue-700",
    "小吃": "bg-orange-100 text-orange-700",
    "饮品": "bg-purple-100 text-purple-700",
  };

  const totalDishes = canteens.reduce((sum, c) => sum + c.dishes.length, 0);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-text-secondary animate-pulse">🍳 正在加载今日菜单...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50
                        bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg
                        text-sm font-medium animate-bounce">
          {toast}
        </div>
      )}

      {/* 顶部统计栏 */}
      <div className="bg-white/80 backdrop-blur border-b border-orange-100">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-text-primary">
              📋 今日菜单
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              共 {canteens.length} 个食堂 · {totalDishes} 道菜品
            </p>
          </div>
          {!userId && (
            <Link to="/login" className="text-sm text-primary font-medium hover:underline">
              登录收藏 →
            </Link>
          )}
        </div>

        {/* 食堂 Tab */}
        <div className="max-w-4xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto">
          {canteens.map((c, i) => (
            <button
              key={c.id}
              onClick={() => setActiveTab(i)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition
                ${activeTab === i
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-text-secondary hover:bg-orange-50 border border-gray-200"}`}
            >
              {c.name} ({c.dishes.length})
            </button>
          ))}
        </div>
      </div>

      {/* 菜品列表 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {canteens.length === 0 ? (
          <div className="text-center py-20 text-text-secondary">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-lg font-medium">今日暂无菜品</p>
            <p className="text-sm mt-1">管理员正在更新菜单，请稍后再来~</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 食堂信息 */}
            {canteens[activeTab] && (
              <div className="bg-white/60 backdrop-blur rounded-2xl p-4 border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
                    🏫
                  </div>
                  <div>
                    <h2 className="font-bold text-text-primary">{canteens[activeTab].name}</h2>
                    <p className="text-xs text-text-secondary">
                      {canteens[activeTab].location} · {canteens[activeTab].description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 菜品卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(canteens[activeTab]?.dishes || []).map(dish => (
                <div
                  key={dish.id}
                  className="card !p-4 flex gap-4 hover:shadow-md hover:-translate-y-0.5
                             transition-all duration-200 group"
                >
                  {/* 左侧菜品图标 */}
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0
                    ${dish.category === "荤菜" ? "bg-red-50" :
                      dish.category === "素菜" ? "bg-green-50" :
                      dish.category === "汤" ? "bg-yellow-50" :
                      dish.category === "主食" ? "bg-blue-50" :
                      "bg-orange-50"}`}>
                    {categoryEmoji[dish.category] || "🍽️"}
                  </div>

                  {/* 中间信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-text-primary truncate">{dish.name}</h3>
                      {dish.tags && dish.tags.split(",").map((t, i) => (
                        <span key={i} className="badge badge-accent text-[10px] shrink-0">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-1">
                      {dish.description || `${dish.calories || "?"} kcal`}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${categoryBg[dish.category] || "bg-gray-100 text-gray-600"}`}>
                        {dish.category}
                      </span>
                      {dish.calories ? (
                        <span className="text-[11px] text-text-secondary">🔥 {dish.calories}kcal</span>
                      ) : null}
                    </div>
                  </div>

                  {/* 右侧价格 + 点赞 */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <span className="text-lg font-extrabold text-primary">
                      ¥{dish.price.toFixed(1)}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleLike(dish); }}
                      className={`flex items-center gap-1 text-xs font-medium transition
                        ${dish.is_liked
                          ? "text-red-500"
                          : "text-gray-300 hover:text-red-400"}`}
                    >
                      <span className={dish.is_liked ? "animate-pulse" : ""}>
                        {dish.is_liked ? "❤️" : "🤍"}
                      </span>
                      <span className="min-w-[16px] text-center">{dish.like_count || ""}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 空菜品提示 */}
            {canteens[activeTab]?.dishes.length === 0 && (
              <div className="text-center py-12 text-text-secondary">
                <div className="text-4xl mb-2">👨‍🍳</div>
                <p>这个食堂今天没有菜品哦</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
