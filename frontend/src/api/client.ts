import axios from "axios";

// 从环境变量获取 API 地址，如果没有则使用相对路径（适用于同源部署）
const API_BASE_URL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

export interface Dish {
  id: number;
  name: string;
  canteen_id: number;
  canteen_name?: string;
  price: number;
  calories?: number;
  protein?: number;
  fat?: number;
  carbs?: number;
  category: string;
  tags?: string;
  image_url?: string;
  description?: string;
}

export interface RecommendPlan {
  dish_ids: number[];
  dishes: Dish[];
  total_price: number;
  total_calories: number;
  total_protein: number;
  total_fat?: number;
  total_carbs?: number;
  score: number;
  reasons?: string[];
}

export const authAPI = {
  register: (username: string, password: string, nickname?: string) =>
    api.post("/user/register", { username, password, nickname }),
  login: (username: string, password: string) =>
    api.post("/user/login", { username, password }),
  getProfile: (userId: number) =>
    api.get(`/user/profile?user_id=${userId}`),
  savePreferences: (userId: number, prefs: any) =>
    api.post("/user/preferences", { user_id: userId, ...prefs }),
};

export interface Canteen {
  id: number;
  name: string;
  location?: string;
}

export const dishAPI = {
  list: (params?: { canteen_id?: number; category?: string; keyword?: string; max_price?: number }) =>
    api.get("/dish/list", { params }),
  canteens: () =>
    api.get("/dish/canteens"),
  add: (dish: Omit<Dish, "id" | "canteen_name"> & { canteen_id: number }) =>
    api.post("/dish/add", dish),
  update: (dishId: number, dish: Partial<Omit<Dish, "id" | "canteen_name"> & { canteen_id?: number }>) =>
    api.put(`/dish/update?dish_id=${dishId}`, dish),
  delete: (dishId: number) =>
    api.delete(`/dish/delete?dish_id=${dishId}`),
};

export const recommendAPI = {
  get: (userId: number, budget?: number) =>
    api.get(`/recommend/for_user?user_id=${userId}&budget=${budget || 0}`),
  history: (userId: number) =>
    api.get(`/recommend/history?user_id=${userId}`),
};

export const feedbackAPI = {
  like: (userId: number, dishId: number) =>
    api.post(`/feedback/like?user_id=${userId}&dish_id=${dishId}`),
  skip: (userId: number, dishId: number) =>
    api.post(`/feedback/skip?user_id=${userId}&dish_id=${dishId}`),
};

export default api;
