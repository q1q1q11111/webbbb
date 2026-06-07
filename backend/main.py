from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
import os
from app.db.database import init_db
from app.api import user, dish, recommend, feedback

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="校园食堂推荐助手 API", lifespan=lifespan)

# CORS 配置 —— 允许所有来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 路由（必须放在最前面）
app.include_router(user.router, prefix="/api/user", tags=["用户"])
app.include_router(dish.router, prefix="/api/dish", tags=["菜品"])
app.include_router(recommend.router, prefix="/api/recommend", tags=["推荐"])
app.include_router(feedback.router, prefix="/api/feedback", tags=["反馈"])

# 前端静态文件（frontend/dist/）
dist_dir = Path(__file__).parent.parent / "frontend" / "dist"

if dist_dir.exists():
    # 挂载静态资源（JS、CSS、图片等）
    assets_dir = dist_dir / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    # SPA 兜底：所有 GET 请求返回 index.html
    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        file_path = dist_dir / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(str(file_path))
        return FileResponse(str(dist_dir / "index.html"))
