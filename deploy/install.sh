#!/usr/bin/env bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 运行：sudo bash deploy/install.sh"
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/vesta}"
RUN_USER="${RUN_USER:-www-data}"
SERVICE_SRC="$(cd "$(dirname "$0")" && pwd)/vesta.service"

[ -f "$APP_DIR/package.json" ] || { echo "找不到 $APP_DIR/package.json，先把代码放到 $APP_DIR"; exit 1; }
[ -f "$APP_DIR/.env" ] || { echo "缺少 $APP_DIR/.env"; exit 1; }
command -v node >/dev/null 2>&1 || { echo "没有找到 node，先安装 Node 24 以上版本"; exit 1; }
command -v systemctl >/dev/null 2>&1 || { echo "这台机器没有 systemd"; exit 1; }

NODE_BIN="$(command -v node)"
id "$RUN_USER" >/dev/null 2>&1 || RUN_USER="root"

mkdir -p "$APP_DIR/data"
chown -R "$RUN_USER":"$RUN_USER" "$APP_DIR/data"

sed \
  -e "s|__APP_DIR__|$APP_DIR|g" \
  -e "s|__RUN_USER__|$RUN_USER|g" \
  -e "s|__NODE__|$NODE_BIN|g" \
  "$SERVICE_SRC" > /etc/systemd/system/vesta.service

systemctl daemon-reload
systemctl enable vesta
systemctl restart vesta

sleep 2
systemctl --no-pager --lines=0 status vesta || true

echo
echo "已安装。接下来配置 Nginx 和 HTTPS："
echo "  cp deploy/nginx.conf /etc/nginx/sites-available/vesta.conf"
echo "  修改 server_name 后 ln -s 到 sites-enabled，nginx -t && systemctl reload nginx"
echo "  certbot --nginx -d your-domain.com"
