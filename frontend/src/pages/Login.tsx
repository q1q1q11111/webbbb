import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "../api/client";

export default function Login() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!username || !password) {
      setError("请输入用户名和密码");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const api = mode === "login" ? authAPI.login : authAPI.register;
      const res = await api(username, password, nickname);
      if (res.data.error) {
        setError(res.data.error);
      } else {
        localStorage.setItem("user_id", res.data.user_id);
        localStorage.setItem("username", username);
        navigate("/");
      }
    } catch (e: any) {
      setError(e.response?.data?.detail || "请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="card w-full max-w-sm space-y-6">
        {/* 标题 */}
        <div className="text-center space-y-1">
          <div className="text-4xl">🍽️</div>
          <h1 className="text-2xl font-bold text-text-primary">
            {mode === "login" ? "欢迎回来" : "注册账号"}
          </h1>
          <p className="text-sm text-text-secondary">
            {mode === "login" ? "登录后获取个性化推荐" : "注册后开始你的美食之旅"}
          </p>
        </div>

        {/* 表单 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-secondary">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="请输入用户名"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-secondary">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition"
            />
          </div>
          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1 text-text-secondary">
                昵称（可选）
              </label>
              <input
                type="text"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
                placeholder="你的昵称"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                           focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                           transition"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="text-red-500 text-sm text-center">{error}</p>
        )}

        {/* 提交按钮 */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary w-full text-lg py-3"
        >
          {loading ? "处理中..." : mode === "login" ? "登录" : "注册"}
        </button>

        {/* 切换模式 */}
        <p className="text-center text-sm text-text-secondary">
          {mode === "login" ? "还没有账号？" : "已有账号？"}
          <button
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            className="text-primary font-medium hover:underline ml-1"
          >
            {mode === "login" ? "去注册" : "去登录"}
          </button>
        </p>
      </div>
    </div>
  );
}
