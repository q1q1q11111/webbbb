import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authAPI, recommendAPI, feedbackAPI, Dish } from "../api/client";
import type { RecommendPlan } from "../api/client";

export default function Profile() {
  const userId = parseInt(localStorage.getItem("user_id") || "0");
  const [history, setHistory]     = useState<RecommendPlan[]>([]);
  const [nickname, setNickname]   = useState("");
  const [likedDishes, setLikedDishes] = useState<Dish[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    // 并行请求
    authAPI.getProfile(userId).then(res => {
      if (res.data) setNickname(res.data.nickname || "");
    });
    recommendAPI.history(userId).then(res => {
      setHistory(res.data || []);
    }).catch(() => {});
    // 获取收藏的菜品
    feedbackAPI.likedDishes(userId).then(res => {
      setLikedDishes(res.data || []);
    }).catch(() => {});
    setLoading(false);
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    window.location.href = "/";
  };

  const handleUnlike = async (dishId: number) => {
    try {
      await feedbackAPI.unlike(userId, dishId);
      setLikedDishes(likedDishes.filter(d => d.id !== dishId));
    } catch (e) {
      console.error("取消收藏失败", e);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔒</div>
        <p className="text-text-secondary">请先登录</p>
        <Link to="/login" className="btn-primary">去登录</Link>
      </div>
    );
  }

  if (loading) {
    return <p className="text-center p-8 text-text-secondary">加载中...</p>;
  }

  const categoryEmoji: Record<string, string> = {
    "荤菜": "🥩", "素菜": "🥬", "汤": "🍲", "主食": "🍚", "小吃": "🍢",
  };

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">

      {/* 用户信息卡片 */}
      <div className="card text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary
                      flex items-center justify-center text-3xl mx-auto">
          {(nickname || "🤗")[0]}
        </div>
        <div>
          <h3 className="text-lg font-bold text-text-primary">{nickname || "同学"}</h3>
          <p className="text-xs text-text-secondary">ID: {userId}</p>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 推荐次数 */}
        <div className="bg-white rounded-2xl p-3 text-center border border-orange-100/60 shadow-sm">
          <div className="text-xl mb-0.5">🎲</div>
          {history.length > 0 ? (
            <div className="text-xl font-extrabold text-primary leading-tight">{history.length}</div>
          ) : (
            <div className="text-xl font-bold text-gray-300 leading-tight">—</div>
          )}
          <div className="text-[10px] text-text-secondary mt-0.5">推荐次数</div>
        </div>

        {/* 收藏菜品 */}
        <div className="bg-white rounded-2xl p-3 text-center border border-red-100/60 shadow-sm">
          <div className="text-xl mb-0.5">❤️</div>
          {likedDishes.length > 0 ? (
            <div className="text-xl font-extrabold text-red-500 leading-tight">{likedDishes.length}</div>
          ) : (
            <div className="text-xl font-bold text-gray-300 leading-tight">—</div>
          )}
          <div className="text-[10px] text-text-secondary mt-0.5">收藏菜品</div>
        </div>

        {/* 本周推荐 */}
        <div className="bg-white rounded-2xl p-3 text-center border border-orange-100/60 shadow-sm">
          <div className="text-xl mb-0.5">📅</div>
          {_countThisWeek(history) > 0 ? (
            <div className="text-xl font-extrabold text-primary leading-tight">{_countThisWeek(history)}</div>
          ) : (
            <div className="text-xl font-bold text-gray-300 leading-tight">—</div>
          )}
          <div className="text-[10px] text-text-secondary mt-0.5">本周推荐</div>
        </div>
      </div>

      {/* 我的收藏 */}
      <div>
        <h3 className="font-bold text-text-primary mb-3">❤️ 我的收藏</h3>
        {likedDishes.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-8 bg-orange-50/50 rounded-2xl">
            还没有收藏的菜品，去<a href="/menu" className="text-primary underline">菜单</a>看看吧 🍽️
          </p>
        ) : (
          <div className="space-y-2">
            {likedDishes.slice(0, 20).map(dish => (
              <div key={dish.id} className="card !p-3 flex items-center gap-3 hover:shadow-sm transition">
                <span className="text-xl">
                  {categoryEmoji[dish.category] || "🍽️"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary truncate">{dish.name}</span>
                    {dish.canteen_name && (
                      <span className="text-[10px] text-text-secondary bg-gray-100 px-1.5 py-0.5 rounded shrink-0">
                        {dish.canteen_name}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-text-secondary">¥{dish.price.toFixed(1)}</span>
                </div>
                <button
                  onClick={() => handleUnlike(dish.id)}
                  className="text-xs text-red-400 hover:text-red-500 transition shrink-0"
                >
                  取消
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 推荐历史 */}
      <div>
        <h3 className="font-bold text-text-primary mb-3">📖 推荐历史</h3>
        {history.length === 0 && (
          <p className="text-sm text-text-secondary text-center py-8 bg-orange-50/50 rounded-2xl">
            暂无历史记录，去首页看看吧 🍽️
          </p>
        )}
        <div className="space-y-3">
          {history.slice(0, 10).map((h: any, idx: number) => (
            <HistoryItem key={idx} plan={h} />
          ))}
        </div>
      </div>

      {/* 退出登录 */}
      <button
        onClick={handleLogout}
        className="w-full py-2.5 text-sm text-red-400 hover:bg-red-50
                   rounded-2xl border border-red-100 transition"
      >
        🚪 退出登录
      </button>
    </div>
  );
}


// ─── 历史记录项 ────────────────────────────────────────
function HistoryItem({ plan }: { plan: any }) {
  const [open, setOpen] = useState(false);
  const date = (plan.created_at || "").slice(0, 10);
  return (
    <div className="card !p-3 space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary">
            📅 {date || `推荐 ${plan.id || ""}`}
          </span>
          <span className="badge badge-accent text-xs">
            评分 {plan.score}/10
          </span>
        </div>
        <span className="text-xs text-text-secondary">
          ¥{plan.total_price} ▾
        </span>
      </div>
      {open && (
        <div className="space-y-1 pt-2 border-t border-orange-100">
          {plan.dishes?.map((d: any) => (
            <div key={d.id} className="flex justify-between text-sm">
              <span className="text-text-primary">{d.name}</span>
              <span className="text-primary font-medium">¥{d.price}</span>
            </div>
          ))}
          <div className="flex gap-3 text-xs text-text-secondary pt-1">
            <span>🔥 {plan.total_calories} kcal</span>
            <span>💪 {plan.total_protein}g 蛋白质</span>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── 本周推荐次数 ───────────────────────────────────────
function _countThisWeek(history: any[]): number {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // 周日
  weekStart.setHours(0, 0, 0, 0);
  return history.filter(h => {
    const d = new Date(h.created_at);
    return d >= weekStart;
  }).length;
}
