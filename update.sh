#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

say() { printf "\n\033[1;32m→ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }
fail() { printf "\033[1;31m× %s\033[0m\n" "$*" >&2; exit 1; }

[ -f .env ] || fail "缺少 .env，先执行 cp .env.example .env 并填写账号密码"
command -v node >/dev/null 2>&1 || fail "没有找到 node，需要 Node 24 或更高版本"

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
[ "$NODE_MAJOR" -ge 24 ] || warn "当前 $(node -v)，建议升级到 Node 24 以上"

mkdir -p data/backups
if [ -f data/vesta.db ]; then
  BACKUP="data/backups/vesta-$(date +%Y%m%d-%H%M%S).db"
  if node deploy/backup.mjs data/vesta.db "$BACKUP"; then
    echo "已备份到 $BACKUP"
  else
    warn "数据库备份失败，继续更新"
  fi
  ls -1t data/backups/vesta-*.db 2>/dev/null | tail -n +15 | xargs -r rm -f
fi

say "安装依赖"
npm install --no-audit --no-fund

say "构建前端"
npm run build

MODE="${DEPLOY_MODE:-$(grep -E '^DEPLOY_MODE=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)}"
MODE="${MODE:-auto}"
PORT="${PORT:-$(grep -E '^PORT=' .env 2>/dev/null | tail -n1 | cut -d= -f2- || true)}"
PORT="${PORT:-8787}"

say "重启服务"
case "$MODE" in
  docker)
    docker compose up -d --build
    ;;
  systemd)
    if [ "$(id -u)" -eq 0 ]; then systemctl restart vesta; else sudo systemctl restart vesta; fi
    ;;
  pm2)
    pm2 restart vesta --update-env
    ;;
  none)
    warn "DEPLOY_MODE=none，没有自动重启，请手动重启 node 进程"
    ;;
  auto)
    if [ -f docker-compose.yml ] && command -v docker >/dev/null 2>&1 && docker compose ps --status running 2>/dev/null | grep -q vesta; then
      docker compose up -d --build
    elif command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files --no-legend vesta.service 2>/dev/null | grep -q '^vesta\.service'; then
      if [ "$(id -u)" -eq 0 ]; then systemctl restart vesta; else sudo systemctl restart vesta; fi
    elif command -v pm2 >/dev/null 2>&1 && pm2 pid vesta >/dev/null 2>&1; then
      pm2 restart vesta --update-env
    else
      warn "没有找到 vesta 服务，首次部署请先运行 deploy/install.sh"
      warn "或者手动重启 node 进程"
    fi
    ;;
  *)
    fail "未知的 DEPLOY_MODE：$MODE"
    ;;
esac

say "健康检查"
HEALTH="http://127.0.0.1:${PORT}/api/health"
OK=0
for _ in $(seq 1 30); do
  if node -e "fetch(process.argv[1]).then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" "$HEALTH" 2>/dev/null; then
    OK=1
    break
  fi
  sleep 1
done

if [ "$OK" -eq 1 ]; then
  say "更新完成，服务正常"
  echo "后台入口 /admin"
else
  warn "服务没有在 30 秒内就绪，看看日志：journalctl -u vesta -n 50 --no-pager"
  exit 1
fi
