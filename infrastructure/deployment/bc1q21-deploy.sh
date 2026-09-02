#!/usr/bin/env bash
set -euo pipefail
umask 027

exec 9>/run/lock/bc1q21-deploy.lock
/usr/bin/flock -n 9 || { echo "ERROR: another deployment is already running"; exit 1; }


REPO_DIR="/opt/bc1q21/repo"
VENV_PYTHON="/opt/bc1q21/venv/bin/python"
SERVICE="bc1q21.service"

if [ "$#" -ne 1 ] || [[ ! "$1" =~ ^[0-9a-f]{40}$ ]]; then
    echo "ERROR: exactly one 40-character Git commit SHA is required"
    exit 2
fi

TARGET_SHA="$1"
cd "$REPO_DIR"

OLD_SHA="$(/usr/bin/sudo -u bc1q21 /usr/bin/git rev-parse HEAD)"

if [ -n "$(/usr/bin/sudo -u bc1q21 /usr/bin/git status --porcelain)" ]; then
    echo "ERROR: production repository has uncommitted changes"
    exit 1
fi

echo "==> Fetching approved commit"
/usr/bin/sudo -u bc1q21 /usr/bin/git fetch --prune origin main

if ! /usr/bin/sudo -u bc1q21 /usr/bin/git cat-file -e "${TARGET_SHA}^{commit}" 2>/dev/null; then
    echo "ERROR: approved commit does not exist after fetch"
    exit 1
fi

if ! /usr/bin/sudo -u bc1q21 /usr/bin/git merge-base --is-ancestor "$TARGET_SHA" origin/main; then
    echo "ERROR: approved commit is not contained in origin/main"
    exit 1
fi

if ! /usr/bin/sudo -u bc1q21 /usr/bin/git merge-base --is-ancestor "$OLD_SHA" "$TARGET_SHA"; then
    echo "ERROR: approved commit is older than or unrelated to current production"
    exit 1
fi


rollback() {
    local rc="$1"
    trap - ERR

    echo "ERROR: deployment failed; rolling back to ${OLD_SHA}"
    /usr/bin/sudo -u bc1q21 /usr/bin/git reset --hard "$OLD_SHA" || true
    /usr/bin/sudo -u bc1q21 "$VENV_PYTHON" -m pip install -r "$REPO_DIR/Backend/requirements.txt" || true
    /usr/bin/systemctl restart "$SERVICE" || true

    echo "ERROR: rollback attempted; deployment not completed"
    exit "$rc"
}

trap 'rollback $?' ERR

echo "==> Deploying exact approved commit ${TARGET_SHA}"
/usr/bin/sudo -u bc1q21 /usr/bin/git reset --hard "$TARGET_SHA"

echo "==> Installing backend dependencies"
    /usr/bin/sudo -u bc1q21 "$VENV_PYTHON" -m pip install -r "$REPO_DIR/Backend/requirements.txt"

echo "==> Restarting backend"
/usr/bin/systemctl restart "$SERVICE"

echo "==> Waiting for backend"
backend_ok=false
for i in {1..30}; do
    if /usr/bin/curl -fsS http://127.0.0.1:8000/ >/dev/null; then
        backend_ok=true
        break
    fi
    /usr/bin/sleep 1
done

if [ "$backend_ok" != true ]; then
    echo "ERROR: backend not responding after 30 seconds"
    false
fi


trap - ERR
echo "==> Deployment successful: ${TARGET_SHA}"
