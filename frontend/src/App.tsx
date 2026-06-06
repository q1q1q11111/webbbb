import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Preferences from "./pages/Preferences";
import RecommendResult from "./pages/RecommendResult";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background">
        {/* 顶部导航 */}
        <nav className="sticky top-0 z-50
                        bg-white/80 backdrop-blur-md
                        border-b border-orange-100
                        px-4 py-3
                        flex items-center justify-between
                        shadow-sm">
          <a href="/"
             className="text-primary font-extrabold text-lg tracking-tight
                        hover:opacity-80 transition">
            🍽️ 食堂推荐
          </a>
          <div className="flex gap-5 text-sm">
            <a href="/preferences"
               className="text-text-secondary hover:text-primary transition font-medium">
              ⚙️ 偏好
            </a>
            <a href="/profile"
               className="text-text text-secondary hover:text-primary transition font-medium">
              👤 我的
            </a>
            <a href="/admin"
               className="text-text-secondary hover:text-orange-600 transition font-medium">
              🛠️ 管理
            </a>
          </div>
        </nav>

        {/* 页面内容 */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/recommend" element={<RecommendResult />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
