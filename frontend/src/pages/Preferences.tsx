import { useState, useEffect } from "react";
import { authAPI } from "../api/client";

const DIETARY_OPTIONS = [
  { value: "",     label: "不限",  emoji: "🍽️" },
  { value: "素食", label: "素食",  emoji: "🥬" },
  { value: "清真", label: "清真",  emoji: "☪️" },
  { value: "荤食", label: "荤食",  emoji: "🥩" },
];

const SPICY_LEVELS = [
  { value: 0, label: "不辣",  emoji: "😊" },
  { value: 1, label: "微辣",  emoji: "😋" },
  { value: 2, label: "中辣",  emoji: "🤤" },
  { value: 3, label: "重辣",  emoji: "🔥" },
];

export default function Preferences() {
  const userId = parseInt(localStorage.getItem("user_id") || "0");
  const [dietary, setDietary]   = useState("");
  const [allergies, setAllergies] = useState("");
  const [spicy, setSpicy]       = useState(0);
  const [sweet, setSweet]       = useState(false);
  const [sour, setSour]         = useState(false);
  const [budget, setBudget]     = useState("");
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    authAPI.getProfile(userId).then(res => {
      const p = res.data;
      if (p) {
        setDietary(p.dietary_type || "");
        setAllergies(p.allergies || "");
        setSpicy(p.spicy_level || 0);
        setSweet(!!p.sweet_preference);
        setSour(!!p.sour_preference);
        setBudget(p.budget ? String(p.budget) : "");
      }
    }).finally(() => setLoading(false));
  }, [userId]);

  const handleSave = async () => {
    await authAPI.savePreferences(userId, {
      dietary_type:   dietary,
      allergies,
      spicy_level:    spicy,
      sweet_preference: sweet,
      sour_preference:  sour,
      budget: budget ? parseFloat(budget) : 0,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

  // 忌口标签
  const allergyTags = allergies.split(",").map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-6">

      <h2 className="text-xl font-extrabold text-text-primary text-center">
        ⚙️ 饮食偏好设置
      </h2>

      <div className="card space-y-6">

        {/* 饮食类型 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            饮食类型
          </label>
          <div className="grid grid-cols-4 gap-2">
            {DIETARY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setDietary(opt.value)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition
                  ${dietary === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-100 hover:border-primary/30 text-text-secondary"}`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 忌口 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            忌口
          </label>
          <input
            type="text"
            value={allergies}
            onChange={e => setAllergies(e.target.value)}
            placeholder="如：香菜、芹菜（逗号分隔）"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5
                       focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                       transition text-sm"
          />
          {allergyTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {allergyTags.map(tag => (
                <span key={tag} className="badge badge-primary">{tag}</span>
              ))}
            </div>
          )}
        </div>

        {/* 吃辣程度 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            吃辣程度
          </label>
          <div className="flex gap-2">
            {SPICY_LEVELS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSpicy(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition
                  ${spicy === opt.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-100 hover:border-primary/30 text-text-secondary"}`}
              >
                <span className="text-lg">{opt.emoji}</span>
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 口味偏好 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            口味偏好
          </label>
          <div className="flex gap-4">
            <Toggle label="喜甜 🍬"  value={sweet} onChange={setSweet} />
            <Toggle label="喜酸 🍋"  value={sour}  onChange={setSour}  />
          </div>
        </div>

        {/* 预算 */}
        <div>
          <label className="block text-sm font-medium mb-2 text-text-secondary">
            每餐预算（元）
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold">¥</span>
            <input
              type="number"
              value={budget}
              onChange={e => setBudget(e.target.value)}
              placeholder="0 表示不限"
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                         transition text-center text-lg font-semibold"
            />
          </div>
          {budget && parseFloat(budget) > 0 && (
            <p className="text-xs text-text-secondary mt-1 text-center">
              目标：每餐约 ¥{budget} 以内
            </p>
          )}
        </div>

        {/* 保存按钮 */}
        <button
          onClick={handleSave}
          className="btn-primary w-full py-3 text-base"
        >
          {saved ? "✅ 已保存" : "💾 保存偏好"}
        </button>
      </div>
    </div>
  );
}


// ─── 开关组件 ───────────────────────────────────────────
function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 transition
        ${value
          ? "border-accent bg-accent/5 text-accent-dark"
          : "border-gray-100 text-text-secondary hover:border-accent/30"}`}
    >
      <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition
        ${value ? "border-accent bg-accent" : "border-gray-300"}`}>
        {value && <span className="text-white text-xs">✓</span>}
      </span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
