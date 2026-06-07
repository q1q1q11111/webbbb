import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Menu from "./pages/Menu";
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
          <Link to="/"
             className="text-primary font-extrabold text-lg tracking-tight
                        hover:opacity-80 transition">
            🍽️ 食堂推荐
          </Link>
          <div className="flex gap-4 text-sm">
            <Link to="/menu"
               className="text-text-secondary hover:text-primary transition font-medium">
              📋 菜单
            </Link>
            <Link to="/preferences"
               className="text-text-secondary hover:text-primary transition font-medium">
              ⚙️ 偏好
            </Link>
            <Link to="/profile"
               className="text-text-secondary hover:text-primary transition font-medium">
              👤 我的
            </Link>
            <Link to="/admin"
               className="text-text-secondary hover:text-orange-600 transition font-medium">
              🛠️ 管理
            </Link>
          </div>
        </nav>

        {/* 页面内容 */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/preferences" element={<Preferences />} />
          <Route path="/recommend" element={<RecommendResult />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
