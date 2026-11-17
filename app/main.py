from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import applications, auth, career, integrations, profile, vacancies


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.validate_for_prod()
    yield


app = FastAPI(title="Jobly API", version="0.1.0", lifespan=lifespan,
              docs_url="/docs" if settings.app_env != "prod" else None, redoc_url=None)
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",") if o.strip()],
                   allow_methods=["*"], allow_headers=["*"])
for r in (auth, profile, vacancies, applications, career, integrations):
    app.include_router(r.router)


@app.get("/healthz", tags=["system"])
def healthz():
    return {"status": "ok"}
