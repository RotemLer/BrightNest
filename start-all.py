import os
import sys
import subprocess
import time
import platform

# --- הגדרות בסיס ---
backend_dir = os.path.join(os.getcwd(), "Backend")
frontend_dir = os.path.join(os.getcwd(), "UI")
venv_dir = os.path.join(backend_dir, "venv")
flask_host = "127.0.0.1"
flask_port = "5000"


# --- פונקציות עזר ---

def run_command(command, cwd=None, shell=False):
    print(f"👉 Running: {command}")
    result = subprocess.run(command, cwd=cwd, shell=shell)
    if result.returncode != 0:
        print(f"❌ Command failed: {command}")
        sys.exit(1)


def is_windows():
    return platform.system() == "Windows"


def create_virtualenv():
    if not os.path.exists(venv_dir):
        print("🐍 Creating Python virtual environment...")
        run_command([sys.executable, "-m", "venv", venv_dir])


def activate_virtualenv():
    print("🐍 Activating virtual environment...")
    if is_windows():
        activate_script = os.path.join(venv_dir, "Scripts", "activate.bat")
        command = f'cmd /k "{activate_script}"'
        os.system(command)
    else:
        activate_script = os.path.join(venv_dir, "bin", "activate")
        os.system(f"source {activate_script}")


def install_requirements():
    print("📦 Installing Python dependencies from requirements.txt...")
    pip_executable = os.path.join(venv_dir, "bin", "pip") if not is_windows() else os.path.join(venv_dir, "Scripts",
                                                                                                "pip.exe")
    run_command([pip_executable, "install", "-r", "requirements.txt"], cwd=backend_dir)


def start_backend():
    print("🚀 Starting Flask backend...")
    flask_env = os.environ.copy()
    flask_env["FLASK_APP"] = "app.py"
    flask_env["FLASK_ENV"] = "development"

    python_executable = os.path.join(venv_dir, "bin", "python") if not is_windows() else os.path.join(venv_dir,
                                                                                                      "Scripts",
                                                                                                      "python.exe")

    subprocess.Popen(
        [python_executable, "app.py"],
        cwd=backend_dir,
        env=flask_env,
        stdout=sys.stdout,
        stderr=sys.stderr,
        shell=is_windows()
    )


def wait_for_backend():
    print("⏳ Waiting for Flask backend to start...")
    import requests
    url = f"http://{flask_host}:{flask_port}/"
    while True:
        try:
            response = requests.head(url)
            if response.status_code < 500:
                print("✅ Flask backend is fully up!")
                break
        except Exception:
            pass
        print(".", end="", flush=True)
        time.sleep(1)


def start_frontend():
    print("🚀 Starting React frontend...")
    run_command(["npm", "install"], cwd=frontend_dir, shell=is_windows())
    run_command(["npm", "start"], cwd=frontend_dir, shell=is_windows())


# --- ריצה עיקרית ---
def main():
    create_virtualenv()
    install_requirements()
    start_backend()
    wait_for_backend()
    start_frontend()


if __name__ == "__main__":
    main()