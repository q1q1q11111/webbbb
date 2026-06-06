import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { recommendAPI, authAPI } from "../api/client";

export default function Home() {
  const [userId, setUserId] = useState<number>(() => {
    const stored = localStorage.getItem("user_id");
    return stored ? parseInt(stored) : 0;
  });
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // 已登录但首次进入时同步后端（确保偏好存在）
  useEffect(() => {
    if (userId && budget) {
      // 有预算时自动尝试推荐（可选）
    }
  }, []);

  const handleRecommend = async () => {
    if (!userId) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await recommendAPI.get(userId, parseFloat(budget) || 0);
      localStorage.setItem("recommend_results", JSON.stringify(res.data.plans));
      navigate("/recommend");
    } catch (e: any) {
      setError(e.response?.data?.detail || "推荐失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user_id");
    localStorage.removeItem("username");
    setUserId(0);
  };

  const username = localStorage.getItem("username") || "";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4
                    bg-gradient-to-br from-background via-orange-50 to-yellow-50
                    relative overflow-hidden">

      {/* 装饰圆球 */}
      <div className="absolute top-[-60px] right-[-60px] w-64 h-64
                      bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-40px] left-[-40px] w-48 h-48
                      bg-secondary/20 rounded-full blur-2xl pointer-events-none" />

      {/* 主内容 */}
      <div className="relative z-10 w-full max-w-sm space-y-8">

        {/* 标题区 */}
        <div className="text-center space-y-2">
          <div className="text-6xl">🍽️</div>
          <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">
            今天吃什么？
          </h1>
          <p className="text-text-secondary text-sm">
            {userId
              ? `👋 ${username || "同学"}，根据你的口味推荐`
              : "登录后获取个性化推荐"}
          </p>
        </div>

        {/* 输入区 */}
        <div className="card space-y-5">

          {/* 预算输入 */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-secondary">
              每餐预算（元）
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-lg">
                ¥
              </span>
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(e.target.value)}
                placeholder="0 表示不限预算"
                className="w-full border border-gray-200 rounded-2xl pl-10 pr-4 py-3
                           text-lg font-medium text-center
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                           transition"
              />
            </div>
          </div>

          {/* 推荐按钮 */}
          <button
            onClick={handleRecommend}
            disabled={loading}
            className="btn-primary w-full text-xl py-4 rounded-2xl
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="inline-block animate-spin">⏳</span>
                推荐中...
              </>
            ) : (
              <>
                <span>🎯</span>
                帮我推荐
              </>
            )}
          </button>

          {error && (
            <p className="text-red-500 text-sm text-center bg-red-50 rounded-lg py-2">
              {error}
            </p>
          )}
        </div>

        {/* 快捷操作 */}
        <div className="flex justify-center gap-4 text-sm">
          <button
            onClick={() => navigate("/preferences")}
            className="text-primary hover:underline font-medium"
          >
            ⚙️ 偏好设置
          </button>
          {userId && (
            <button
              onClick={() => navigate("/profile")}
              className="text-text-secondary hover:underline"
            >
              👤 个人中心
            </button>
          )}
        </div>

        {/* 未登录提示 */}
        {!userId && (
          <div className="text-center">
            <button
              onClick={() => navigate("/login")}
              className="btn-secondary text-base px-8 py-2.5"
            >
              登录 / 注册
            </button>
          </div>
        )}

        {/* 退出登录 */}
        {userId && (
          <div className="text-center">
            <button
              onClick={handleLogout}
              className="text-xs text-gray-400 hover:text-red-400 transition"
            >
              退出登录
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
