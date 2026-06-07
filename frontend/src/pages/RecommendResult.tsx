import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { recommendAPI, feedbackAPI } from "../api/client";
import type { RecommendPlan } from "../api/client";

/** 营养目标（与后端 TARGET 对齐） */
const TARGET = { cal_min: 400, cal_max: 900, prot_min: 15, prot_max: 60 };

export default function RecommendResult() {
  const [plans, setPlans]             = useState<RecommendPlan[]>([]);
  const [loading, setLoading]         = useState(true);
  const [budget, setBudget]           = useState<number>(0);
  const navigate                       = useNavigate();
  const userId = parseInt(localStorage.getItem("user_id") || "0");

  useEffect(() => {
    const stored = localStorage.getItem("recommend_results");
    if (stored) {
      const data = JSON.parse(stored);
      setPlans(data);
      setLoading(false);
      fetchBudget();
    } else if (userId) {
      recommendAPI.get(userId).then(res => {
        setPlans(res.data.plans || []);
        setLoading(false);
        fetchBudget();
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const fetchBudget = async () => {
    if (!userId) return;
    try {
      const r = await fetch(`/api/user/preferences?user_id=${userId}`);
      const d = await r.json();
      if (d.budget) setBudget(parseFloat(d.budget));
    } catch {}
  };

  const handleLike = async (dishId: number) => {
    if (!userId) return alert("请先登录");
    await feedbackAPI.like(userId, dishId);
  };

  const handleSkip = async (dishId: number) => {
    if (!userId) return alert("请先登录");
    await feedbackAPI.skip(userId, dishId);
  };

  /** 选择这个方案并保存历史 */
  const handleChoose = async (plan: RecommendPlan) => {
    if (!userId) return alert("请先登录");
    try {
      await recommendAPI.saveHistory({
        user_id: userId,
        dish_ids: plan.dish_ids.join(","),
        total_price: plan.total_price,
        total_calories: plan.total_calories,
        total_protein: plan.total_protein,
        total_fat: plan.total_fat || 0,
        total_carbs: plan.total_carbs || 0,
        score: plan.score,
      });
      alert(`🎉 已选择方案！总价 ¥${plan.total_price.toFixed(1)}`);
    } catch (e) {
      console.error("保存历史失败", e);
      alert("保存失败，但推荐结果仍可使用");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="text-4xl animate-bounce">🍽️</div>
        <p className="text-text-secondary animate-pulse">正在为你精心搭配...</p>
      </div>
    );
  }

  if (!plans.length) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="text-6xl">😢</div>
        <p className="text-text-secondary">暂无推荐结果</p>
        <button onClick={() => navigate("/")} className="btn-primary">
          重新推荐
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

      {/* 顶部标题 */}
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-text-primary">
          🎲 为你推荐 {plans.length} 种搭配
        </h2>
        {budget > 0 && (
          <p className="text-sm text-text-secondary">
            预算 ¥{budget} ｜ 已为你筛选最优方案
          </p>
        )}
      </div>

      {/* 方案列表 */}
      {plans.map((plan, idx) => (
        <PlanCard
          key={idx}
          plan={plan}
          idx={idx}
          budget={budget}
          userId={userId}
          onLike={handleLike}
          onSkip={handleSkip}
          onChoose={handleChoose}
        />
      ))}

      {/* 底部重新推荐 */}
      <button
        onClick={() => navigate("/")}
        className="btn-secondary w-full py-3 text-base"
      >
        🔄 重新推荐
      </button>
    </div>
  );
}


// ─── 方案卡片组件 ───────────────────────────────────────────────
function PlanCard({
  plan, idx, budget, userId, onLike, onSkip, onChoose
}: {
  plan:   RecommendPlan;
  idx:     number;
  budget:  number;
  userId:  number;
  onLike:  (id: number) => void;
  onSkip:  (id: number) => void;
  onChoose: (plan: RecommendPlan) => void;
}) {
  const cal   = plan.total_calories;
  const prot  = plan.total_protein;
  const price = plan.total_price;

  const calPct  = Math.min(100, cal  / TARGET.cal_max  * 100);
  const protPct = Math.min(100, prot / TARGET.prot_max * 100);
  const budPct  = budget > 0 ? Math.min(100, price / budget * 100) : 60;

  const barColor = (pct: number) =>
    pct < 60 ? "bg-accent" : pct < 90 ? "bg-secondary" : "bg-red-400";

  return (
    <div className="card space-y-4 border border-orange-100
                    hover:border-primary/30 transition-colors">

      {/* 头部：方案编号 + 评分 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-full bg-primary text-white
                         flex items-center justify-center text-sm font-bold">
            {idx + 1}
          </span>
          <span className="font-bold text-text-primary">
            搭配方案 {idx + 1}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold text-primary">
          {"⭐".repeat(Math.min(5, Math.round(plan.score / 2)))}
          <span className="text-xs text-text-secondary ml-1">
            {plan.score}/10
          </span>
        </div>
      </div>

      {/* 菜品列表 */}
      <div className="space-y-2">
        {plan.dishes.map((d: any) => (
          <DishRow
            key={d.id}
            dish={d}
            userId={userId}
            onLike={onLike}
            onSkip={onSkip}
          />
        ))}
      </div>

      {/* 营养进度条 */}
      <div className="space-y-2">
        <NutrientBar label="🔥 热量"   value={cal}  pct={calPct}  color={barColor(calPct)}  unit="kcal" />
        <NutrientBar label="💪 蛋白质" value={prot} pct={protPct} color={barColor(protPct)} unit="g" />
        <NutrientBar label="💰 价格占比" value={price} pct={budPct} color={barColor(budPct)} unit={budget > 0 ? `/¥${budget}` : "元"} />
      </div>

      {/* 推荐理由 */}
      {plan.reasons && plan.reasons.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {plan.reasons.map((r: string, i: number) => (
            <span key={i} className="badge badge-accent text-xs">
              {r}
            </span>
          ))}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onChoose(plan)}
          className="flex-1 btn-primary py-2.5 text-base"
        >
          ✅ 就选这个！
        </button>
      </div>
    </div>
  );
}


// ─── 菜品行 ──────────────────────────────────────────────────
function DishRow({
  dish, userId, onLike, onSkip
}: {
  dish:    any;
  userId:  number;
  onLike:  (id: number) => void;
  onSkip:  (id: number) => void;
}) {
  const tags = (dish.tags || "").split(",").filter(Boolean);
  return (
    <div className="flex items-center justify-between
                     bg-orange-50/50 rounded-xl px-3 py-2.5
                     hover:bg-orange-50 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-text-primary truncate">
            {dish.name}
          </span>
          <span className="badge badge-primary text-xs shrink-0">
            {dish.category}
          </span>
        </div>
        {tags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {tags.map((t: string) => (
              <span key={t} className="text-xs text-text-secondary">
                #{t.trim()}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className="font-bold text-primary">¥{dish.price}</span>
        {userId > 0 && (
          <div className="flex gap-1">
            <span
              onClick={() => onLike(dish.id)}
              className="cursor-pointer text-lg hover:scale-125 transition"
              title="喜欢"
            >❤️</span>
            <span
              onClick={() => onSkip(dish.id)}
              className="cursor-pointer text-lg hover:scale-125 transition"
              title="不喜欢"
            >💔</span>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── 营养进度条 ──────────────────────────────────────────────
function NutrientBar({
  label, value, pct, color, unit
}: {
  label: string;
  value: number;
  pct:   number;
  color: string;
  unit:  string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs text-text-secondary mb-0.5">
        <span>{label}</span>
        <span>{value} {unit}</span>
      </div>
      <div className="progress-bar">
        <div
          className={`progress-fill ${color}`}
          style={{ width: `${Math.max(8, pct)}%` }}
        />
      </div>
    </div>
  );
}
