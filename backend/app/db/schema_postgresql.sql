-- 校园食堂推荐助手 数据库建表 SQL（PostgreSQL 版）
-- 用于生产环境部署（Render PostgreSQL）

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    nickname VARCHAR(50),
    avatar VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 食堂表
CREATE TABLE IF NOT EXISTS canteens (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(200),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 菜品表
CREATE TABLE IF NOT EXISTS dishes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    canteen_id INT REFERENCES canteens(id) ON DELETE CASCADE,
    price NUMERIC(5,2) NOT NULL CHECK (price >= 0),
    calories INT,
    protein NUMERIC(5,1),
    fat NUMERIC(5,1),
    carbs NUMERIC(5,1),
    category VARCHAR(20),
    tags VARCHAR(200),
    image_url VARCHAR(255),
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 用户偏好表
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    dietary_type VARCHAR(20),
    allergies TEXT,
    spicy_level INT DEFAULT 0,
    sweet_preference BOOLEAN,
    sour_preference BOOLEAN,
    budget NUMERIC(5,2),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 推荐历史表
CREATE TABLE IF NOT EXISTS recommendation_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    dish_ids TEXT,
    total_price NUMERIC(5,2),
    total_calories INT,
    total_protein NUMERIC(5,1),
    total_fat NUMERIC(5,1),
    total_carbs NUMERIC(5,1),
    score NUMERIC(4,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 用户行为反馈表
CREATE TABLE IF NOT EXISTS user_feedback (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    dish_id INT REFERENCES dishes(id) ON DELETE CASCADE,
    action VARCHAR(10) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, dish_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_dishes_canteen ON dishes(canteen_id);
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
CREATE INDEX IF NOT EXISTS idx_dishes_price ON dishes(price);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_user ON recommendation_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_feedback_user ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_dish ON user_feedback(dish_id);

-- 初始数据：食堂
INSERT INTO canteens (id, name, location, description) VALUES
(1, '第一食堂', '校园东区', '主打家常菜，价格实惠'),
(2, '第二食堂', '校园西区', '包含清真窗口和素食窗口'),
(3, '风味餐厅', '校园南区', '各地风味小吃聚集地')
ON CONFLICT (id) DO NOTHING;

-- 初始数据：菜品
INSERT INTO dishes (id, name, canteen_id, price, calories, protein, fat, carbs, category, tags, description) VALUES
(1, '红烧肉', 1, 8.50, 420, 22.0, 32.0, 12.0, '荤菜', '咸香,微辣', '经典家常红烧肉'),
(2, '清炒西兰花', 1, 4.00, 80, 4.5, 2.0, 10.0, '素菜', '清淡', '新鲜西兰花清炒'),
(3, '番茄炒蛋', 1, 5.00, 220, 12.0, 14.0, 10.0, '荤菜', '酸甜', '经典下饭菜'),
(4, '白米饭', 1, 1.00, 210, 4.5, 0.5, 46.0, '主食', '清淡', '每份约200g'),
(5, '紫菜蛋花汤', 1, 2.00, 60, 4.0, 3.0, 5.0, '汤', '清淡', '经典蛋花汤'),
(6, '鱼香肉丝', 2, 9.00, 380, 20.0, 25.0, 15.0, '荤菜', '酸甜,微辣', '经典鱼香口味'),
(7, '蒜蓉生菜', 2, 3.50, 60, 2.5, 1.5, 8.0, '素菜', '清淡', '新鲜生菜蒜蓉炒'),
(8, '牛肉面', 3, 12.00, 550, 28.0, 18.0, 65.0, '主食', '咸香,中辣', '手工拉面配牛肉'),
(9, '凉拌黄瓜', 2, 3.00, 40, 1.5, 0.5, 7.0, '素菜', '酸辣', '爽口凉菜'),
(10, '蒸蛋羹', 1, 3.50, 120, 10.0, 8.0, 2.0, '荤菜', '清淡,嫩滑', '经典蒸蛋')
ON CONFLICT (id) DO NOTHING;
