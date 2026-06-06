# 校园食堂推荐助手 - 免费部署指南

本指南将帮助你使用 **Vercel（前端）** + **Render（后端+数据库）** 免费部署项目。

## 📋 目录
1. [准备工作](#准备工作)
2. [后端部署（Render）](#后端部署render)
3. [前端部署（Vercel）](#前端部署vercel)
4. [常见问题](#常见问题)

---

## 准备工作

### 1. 注册账号
- **GitHub**：https://github.com （用于代码托管）
- **Render**：https://render.com （后端部署）
- **Vercel**：https://vercel.com （前端部署）

### 2. 推送代码到 GitHub
```bash
# 在项目根目录执行
git init
git add .
git commit -m "Initial commit: 校园食堂推荐助手"
git remote add origin https://github.com/你的用户名/canteen-advisor.git
git push -u origin main
```

---

## 后端部署（Render）

### 步骤 1：创建 PostgreSQL 数据库

1. 登录 https://render.com
2. 点击 **"New +"** → **"PostgreSQL"**
3. 填写信息：
   - **Name**：`canteen-advisor-db`
   - **Database**：`canteen_advisor`
   - **User**：`canteen_admin`
   - **Plan**：选择 **Free**
4. 点击 **"Create Database"**
5. **⚠️ 重要**：保存数据库连接串（Internal Database URL），格式类似：
   ```
   postgresql://canteen_admin:密码@hostname:5432/canteen_advisor
   ```

### 步骤 2：部署后端服务

1. 在 Render 控制台点击 **"New +"** → **"Web Service"**
2. 连接你的 GitHub 仓库（`canteen-advisor`）
3. 填写配置：
   - **Name**：`canteen-advisor-api`
   - **Region**：选择 `Oregon`（美国西海岸，延迟较低）
   - **Branch**：`main`
   - **Root Directory**：留空（默认根目录）
   - **Runtime**：`Python 3`
   - **Build Command**：
     ```bash
     cd backend && pip install -r requirements.txt
     ```
   - **Start Command**：
     ```bash
     cd backend && gunicorn app.main:app -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
     ```
   - **Plan**：选择 **Free**

4. **环境变量配置**（点击 "Advanced" 展开）：
   
   | Key | Value | 说明 |
   |-----|-------|------|
   | `DATABASE_URL` | 自动关联 | 点击 "Connect" 选择刚才创建的数据库 |
   | `PORT` | `10000` | Render 会自动覆盖此值 |
   | `HOST` | `0.0.0.0` | 监听所有网络接口 |
   | `ALLOWED_ORIGINS` | 暂时填 `*` | 部署前端后再改为前端域名 |
   | `DEBUG` | `False` | 生产环境关闭调试 |

5. 点击 **"Create Web Service"**

6. **等待部署完成**（约 5-10 分钟）

7. 部署成功后，记录后端域名，类似：
   ```
   https://canteen-advisor-api.onrender.com
   ```

### 步骤 3：测试后端 API

在浏览器访问：
```
https://canteen-advisor-api.onrender.com/docs
```

如果看到 FastAPI 的 Swagger 文档页面，说明后端部署成功！✅

---

## 前端部署（Vercel）

### 步骤 1：部署前端

1. 登录 https://vercel.com
2. 点击 **"Add New..."** → **"Project"**
3. 导入 GitHub 仓库（`canteen-advisor`）
4. 配置项目：
   - **Framework Preset**：选择 **Vite**
   - **Root Directory**：`./frontend`
   - **Build Command**：`npm run build`
   - **Output Directory**：`dist`

5. **环境变量配置**：
   
   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | `https://canteen-advisor-api.onrender.com/api` |

6. 点击 **"Deploy"**

7. **等待部署完成**（约 2-5 分钟）

8. 部署成功后，Vercel 会提供一个域名，类似：
   ```
   https://canteen-advisor.vercel.app
   ```

### 步骤 2：更新后端 CORS 配置

1. 回到 **Render 控制台**
2. 选择你的后端服务（`canteen-advisor-api`）
3. 点击 **"Environment"** 标签
4. 修改环境变量：
   - 找到 `ALLOWED_ORIGINS`
   - 将值改为你的 Vercel 前端域名：
     ```
     https://canteen-advisor.vercel.app
     ```
5. 点击 **"Save Changes"**
6. 等待服务自动重启（约 1 分钟）

### 步骤 3：测试完整流程

1. 访问你的 Vercel 前端域名
2. 注册一个新用户
3. 设置饮食偏好
4. 获取推荐方案

如果一切正常，恭喜你！🎉 部署成功！

---

## 常见问题

### Q1：Render 免费版会自动休眠吗？

**A**：是的。如果 15 分钟内没有访问，服务会自动休眠。下次访问时需要等待 10-30 秒唤醒。

**解决方案**：
- 使用 [UptimeRobot](https://uptimerobot.com/) 定时 ping 你的后端 API（每 14 分钟一次）
- 或升级到付费计划（$7/月）

### Q2：数据库免费版有啥限制？

**A**：Render PostgreSQL 免费版限制：
- 存储空间：1 GB
- 无自动备份
- 服务删除时数据库也会被删除

**建议**：定期导出数据库备份。

### Q3：前端 API 请求失败（CORS 错误）

**A**：检查以下几点：
1. 后端 `ALLOWED_ORIGINS` 环境变量是否包含前端域名
2. 前端 `REACT_APP_API_URL` 是否配置正确
3. 浏览器开发者工具查看具体错误信息

### Q4：如何更新代码？

**A**：只需推送到 GitHub，Render 和 Vercel 会自动重新部署：
```bash
git add .
git commit -m "更新功能"
git push origin main
```

### Q5：Render 的环境变量 `DATABASE_URL` 如何配置？

**A**：不需要手动填写！在 Render 控制台：
1. 进入你的 Web Service
2. 点击 **"Environment"**
3. 找到 `DATABASE_URL`
4. 点击 **"Connect"** 按钮
5. 选择你创建的 PostgreSQL 数据库
6. Render 会自动填入连接串

---

## 🎯 部署检查清单

- [ ] 代码已推送到 GitHub
- [ ] Render PostgreSQL 数据库已创建
- [ ] Render 后端服务已部署，可访问 `/docs`
- [ ] Vercel 前端已部署
- [ ] 后端 `ALLOWED_ORIGINS` 已配置前端域名
- [ ] 前端 `REACT_APP_API_URL` 已配置后端域名
- [ ] 可正常注册、登录、获取推荐

---

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 Render 控制台的生产日志
2. 查看 Vercel 部署日志
3. 使用浏览器开发者工具查看网络请求
4. 向我（小邱）求助！😊

---

**祝你部署顺利！** 🚀
