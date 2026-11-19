#!/usr/bin/env python3
"""Запуск Jobly одной командой: python run.py

Ставит зависимости, создаёт .env, применяет миграции и запускает
бэкенд (http://localhost:8000) и фронтенд (http://localhost:3000).
Остановка: Ctrl+C.
"""
import hashlib
import os
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
FRONT = ROOT / "frontend"
VENV = ROOT / ".venv"
WIN = os.name == "nt"
PY = VENV / ("Scripts/python.exe" if WIN else "bin/python")
API_PORT, WEB_PORT = 8000, 3000


def step(msg):
    print(f"\n==> {msg}", flush=True)


def die(msg):
    print(f"\n[ошибка] {msg}", file=sys.stderr, flush=True)
    sys.exit(1)


def run(cmd, **kw):
    if subprocess.run([str(c) for c in cmd], **kw).returncode:
        die("команда завершилась с ошибкой: " + " ".join(map(str, cmd)))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def port_busy(port):
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


def check_tools():
    if sys.version_info < (3, 10):
        die("нужен Python 3.10 или новее: https://www.python.org/downloads/")
    npm = shutil.which("npm")
    node = shutil.which("node")
    if not npm or not node:
        die("не найден Node.js. Установите версию 20 или новее: https://nodejs.org/")
    major = int(subprocess.check_output([node, "--version"], text=True).strip().lstrip("v").split(".")[0])
    if major < 20:
        die(f"нужен Node.js 20 или новее, установлен {major}: https://nodejs.org/")
    for port in (API_PORT, WEB_PORT):
        if port_busy(port):
            die(f"порт {port} уже занят. Закройте программу, которая его использует (возможно, Jobly уже запущен).")
    return npm


def setup_backend():
    if not PY.exists():
        step("Создаю виртуальное окружение Python (.venv)")
        run([sys.executable, "-m", "venv", VENV])
    req = ROOT / "requirements.txt"
    marker = VENV / ".requirements.sha256"
    if not marker.exists() or marker.read_text() != digest(req):
        step("Устанавливаю зависимости бэкенда")
        run([PY, "-m", "pip", "install", "-q", "--disable-pip-version-check", "-r", req])
        marker.write_text(digest(req))


def ensure_env():
    env = ROOT / ".env"
    if env.exists():
        return
    step("Создаю .env для локального запуска")
    fernet = subprocess.check_output(
        [str(PY), "-c", "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())"], text=True
    ).strip()
    admin = ""
    if sys.stdin.isatty():
        admin = input("Email администратора — он получит доступ к админке (Enter — пропустить): ").strip()
    values = {
        "APP_ENV": "dev",
        "DATABASE_URL": "sqlite:///./jobly.db",
        "JWT_SECRET": secrets.token_urlsafe(48),
        "SECRETS_KEY": fernet,
        "ADMIN_EMAILS": admin,
    }
    lines = []
    for line in (ROOT / ".env.example").read_text(encoding="utf-8").splitlines():
        key = line.split("=", 1)[0].strip()
        if not line.startswith("#") and key in values:
            line = f"{key}={values.pop(key)}"
        lines.append(line)
    lines += [f"{k}={v}" for k, v in values.items()]
    env.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("    .env создан. Его можно править; при следующих запусках он не перезаписывается.")


def migrate():
    step("Применяю миграции базы данных")
    run([PY, "-m", "alembic", "upgrade", "head"], cwd=ROOT)


def setup_frontend(npm):
    lock = FRONT / "package-lock.json"
    marker = FRONT / "node_modules" / ".package-lock.sha256"
    if not marker.exists() or marker.read_text() != digest(lock):
        step("Устанавливаю зависимости фронтенда (первый раз занимает пару минут)")
        run([npm, "install", "--no-audit", "--no-fund"], cwd=FRONT)
        marker.write_text(digest(lock))


def start(cmd, cwd):
    kw = {} if WIN else {"start_new_session": True}
    return subprocess.Popen([str(c) for c in cmd], cwd=cwd, **kw)


def stop(procs):
    for p in procs:
        if p.poll() is not None:
            continue
        if WIN:
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(p.pid)], capture_output=True)
        else:
            try:
                os.killpg(p.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
    for p in procs:
        try:
            p.wait(timeout=10)
        except subprocess.TimeoutExpired:
            p.kill()


def interrupt(*_):
    raise KeyboardInterrupt


def main():
    os.chdir(ROOT)
    signal.signal(signal.SIGTERM, interrupt)
    npm = check_tools()
    setup_backend()
    ensure_env()
    migrate()
    setup_frontend(npm)

    step("Запускаю бэкенд и фронтенд")
    procs = [
        start([PY, "-m", "uvicorn", "app.main:app", "--reload", "--reload-dir", "app", "--port", API_PORT], ROOT),
        start([npm, "run", "dev", "--", "-p", WEB_PORT], FRONT),
    ]
    url = f"http://localhost:{WEB_PORT}"
    opened = False
    try:
        while all(p.poll() is None for p in procs):
            if not opened and port_busy(WEB_PORT) and port_busy(API_PORT):
                opened = True
                print(f"\n    Jobly запущен: {url}  (API: http://localhost:{API_PORT}/docs)\n    Остановить: Ctrl+C\n", flush=True)
                if "--no-browser" not in sys.argv:
                    webbrowser.open(url)
            time.sleep(1)
        print("\n[ошибка] один из процессов завершился, останавливаю остальные", file=sys.stderr)
    except KeyboardInterrupt:
        print("\nОстанавливаю…")
    finally:
        stop(procs)


if __name__ == "__main__":
    main()
