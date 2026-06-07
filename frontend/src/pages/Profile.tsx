import { useEffect, useState } from "react";
import { authAPI, recommendAPI, feedbackAPI } from "../api/client";
import type { RecommendPlan } from "../api/client";

export default function Profile() {
  const userId = parseInt(localStorage.getItem("user_id") || "0");
  const [history, setHistory]     = useState<RecommendPlan[]>([]);
  const [nickname, setNickname]   = useState("");
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }

    authAPI.getProfile(userId).then(res => {
      if (res.data) setNickname(res.data.nickname || "");
    });

    recommendAPI.history(userId).then(res => {
      setHistory(res.data || []);
    }).catch(() => {});

    // 统计点赞数（用 feedbackAPI，自动拼接 baseURL）
    feedbackAPI.likeCount(userId)
      .then(d => setLikeCount(d.data?.count || 0))
      .catch(() => {});

    setLoading(false);
  }, [userId]);

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    window.location.reload();
  };

  if (!userId) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">🔒</div>
        <p className="text-text-secondary">请先登录</p>
        <a href="/login" className="btn-primary">去登录</a>
      </div>
    );
  }

  if (loading) {
    return <p className="text-center p-8 text-text-secondary">加载中...</p>;
  }

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
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="推荐次数"  value={history.length}  emoji="🎲" />
        <StatCard label="点赞菜品"  value={likeCount}        emoji="❤️" />
        <StatCard label="本周推荐"  value={_countThisWeek(history)} emoji="📅" />
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


// ─── 统计卡片 ─────────────────────────────────────────
function StatCard({ label, value, emoji }: { label: string; value: number; emoji: string }) {
  return (
    <div className="card text-center space-y-1 !p-3">
      <div className="text-xl">{emoji}</div>
      <div className="text-lg font-extrabold text-primary">{value}</div>
      <div className="text-xs text-text-secondary">{label}</div>
    </div>
  );
}


// ─── 历史记录项 ─────────────────────────────────────────
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
