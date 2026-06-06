import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { dishAPI, Canteen, Dish } from "../api/client";

export default function Admin() {
  const navigate = useNavigate();
  const userId = Number(localStorage.getItem("userId") || 0);

  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  // 表单状态
  const [form, setForm] = useState({
    name: "",
    canteen_id: 0,
    price: "",
    calories: "",
    protein: "",
    fat: "",
    carbs: "",
    category: "荤菜",
    tags: "",
    description: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  // 简单权限检查（暂时用 user_id=1 作为管理员）
  useEffect(() => {
    if (!userId) {
      navigate("/login");
    }
  }, [userId, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, dRes] = await Promise.all([
        dishAPI.canteens(),
        dishAPI.list(),
      ]);
      setCanteens(cRes.data);
      setDishes(dRes.data);
      if (cRes.data.length > 0 && !form.canteen_id) {
        setForm(f => ({ ...f, canteen_id: cRes.data[0].id }));
      }
    } catch (e: any) {
      setMsg("加载失败：" + (e.response?.data?.detail || e.message));
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleChange = (key: string, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
  };

  const resetForm = () => {
    setForm({
      name: "",
      canteen_id: canteens[0]?.id || 0,
      price: "",
      calories: "",
      protein: "",
      fat: "",
      carbs: "",
      category: "荤菜",
      tags: "",
      description: "",
    });
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    if (!form.name || !form.price) {
      setMsg("❌ 菜品名称和价格必填");
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await dishAPI.update(editingId, {
          name: form.name,
          price: Number(form.price),
          calories: form.calories ? Number(form.calories) : 0,
          protein: form.protein ? Number(form.protein) : 0,
          fat: form.fat ? Number(form.fat) : 0,
          carbs: form.carbs ? Number(form.carbs) : 0,
          category: form.category,
          tags: form.tags,
          description: form.description,
        });
        setMsg("✅ 菜品更新成功！");
      } else {
        await dishAPI.add({
          name: form.name,
          canteen_id: form.canteen_id,
          price: Number(form.price),
          calories: form.calories ? Number(form.calories) : 0,
          protein: form.protein ? Number(form.protein) : 0,
          fat: form.fat ? Number(form.fat) : 0,
          carbs: form.carbs ? Number(form.carbs) : 0,
          category: form.category,
          tags: form.tags,
          description: form.description,
        });
        setMsg("✅ 菜品添加成功！");
      }
      resetForm();
      loadData();
    } catch (e: any) {
      setMsg("❌ " + (e.response?.data?.detail || e.message));
    }
    setLoading(false);
  };

  const handleEdit = (dish: Dish) => {
    setForm({
      name: dish.name,
      canteen_id: dish.canteen_id,
      price: String(dish.price),
      calories: dish.calories ? String(dish.calories) : "",
      protein: dish.protein ? String(dish.protein) : "",
      fat: dish.fat ? String(dish.fat) : "",
      carbs: dish.carbs ? String(dish.carbs) : "",
      category: dish.category || "荤菜",
      tags: dish.tags || "",
      description: dish.description || "",
    });
    setEditingId(dish.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`确定要删除「${name}」吗？`)) return;
    setMsg("");
    try {
      await dishAPI.delete(id);
      setMsg("✅ 已删除");
      loadData();
    } catch (e: any) {
      setMsg("❌ " + (e.response?.data?.detail || e.message));
    }
  };

  const categoryColor: Record<string, string> = {
    "荤菜": "bg-red-100 text-red-700",
    "素菜": "bg-green-100 text-green-700",
    "汤品": "bg-yellow-100 text-yellow-700",
    "主食": "bg-blue-100 text-blue-700",
    "饮品": "bg-purple-100 text-purple-700",
    "小吃": "bg-orange-100 text-orange-700",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50">
      {/* 顶部导航 */}
      <nav className="bg-white/80 backdrop-blur sticky top-0 z-30 border-b border-orange-100">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <span className="font-bold text-gray-800">管理后台</span>
          </div>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-orange-600 hover:text-orange-700"
          >
            ← 返回首页
          </button>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* 提示信息 */}
        {msg && (
          <div className={`mb-6 p-3 rounded-xl text-sm font-medium ${
            msg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" :
            "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {msg}
          </div>
        )}

        {/* === 添加/编辑表单 === */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? "✏️ 编辑菜品" : "➕ 添加新菜品"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 第一行：名称 + 食堂 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">菜品名称 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => handleChange("name", e.target.value)}
                  placeholder="例如：红烧肉"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">所属食堂 *</label>
                <select
                  value={form.canteen_id}
                  onChange={e => handleChange("canteen_id", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                >
                  {canteens.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 第二行：价格 + 分类 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">价格（元） *</label>
                <input
                  type="number" step="0.01"
                  value={form.price}
                  onChange={e => handleChange("price", e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">分类</label>
                <select
                  value={form.category}
                  onChange={e => handleChange("category", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none bg-white"
                >
                  {Object.keys(categoryColor).map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">热量（kcal）</label>
                <input
                  type="number"
                  value={form.calories}
                  onChange={e => handleChange("calories", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">蛋白质（g）</label>
                <input
                  type="number" step="0.1"
                  value={form.protein}
                  onChange={e => handleChange("protein", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
            </div>

            {/* 第三行：脂肪 + 碳水 + 标签 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">脂肪（g）</label>
                <input
                  type="number" step="0.1"
                  value={form.fat}
                  onChange={e => handleChange("fat", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">碳水（g）</label>
                <input
                  type="number" step="0.1"
                  value={form.carbs}
                  onChange={e => handleChange("carbs", e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">标签（逗号分隔）</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={e => handleChange("tags", e.target.value)}
                  placeholder="例如：辣,下饭"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                />
              </div>
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">描述</label>
              <textarea
                value={form.description}
                onChange={e => handleChange("description", e.target.value)}
                placeholder="菜品描述（可选）"
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
              />
            </div>

            {/* 按钮 */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-gradient-to-r from-orange-400 to-amber-400 text-white rounded-lg font-medium text-sm hover:shadow-md transition disabled:opacity-50"
              >
                {editingId ? "💾 保存修改" : "➕ 添加菜品"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                >
                  取消编辑
                </button>
              )}
            </div>
          </form>
        </div>

        {/* === 菜品列表 === */}
        <div className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              📋 菜品列表（共 {dishes.length} 道）
            </h2>
            <button
              onClick={loadData}
              className="text-sm text-orange-600 hover:text-orange-700"
            >
              🔄 刷新
            </button>
          </div>

          {dishes.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">🍽️</div>
              <p>还没有菜品，快去添加吧！</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 px-2">菜品</th>
                    <th className="text-left py-2 px-2">食堂</th>
                    <th className="text-left py-2 px-2">分类</th>
                    <th className="text-right py-2 px-2">价格</th>
                    <th className="text-right py-2 px-2">热量</th>
                    <th className="text-center py-2 px-2">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {dishes.map(dish => (
                    <tr key={dish.id} className="border-b border-gray-50 hover:bg-orange-50/30">
                      <td className="py-3 px-2">
                        <div className="font-medium text-gray-800">{dish.name}</div>
                        {dish.tags && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {dish.tags.split(",").map((t, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-2 text-gray-600">{dish.canteen_name || "-"}</td>
                      <td className="py-3 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColor[dish.category] || "bg-gray-100 text-gray-600"}`}>
                          {dish.category}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium text-orange-600">
                        ¥{dish.price.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right text-gray-500">
                        {dish.calories || "-"}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => handleEdit(dish)}
                            className="text-xs text-blue-600 hover:text-blue-700"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(dish.id, dish.name)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
