#!/usr/bin/env bash
# Vesta 服务器更新入口。
#
# 目标不是“尽量把能做的做完”，而是执行结束后能证明：
#   运行的代码 = origin/main 的最新 commit。
# 每一层校验失败都会立即退出，不会带着旧代码或旧构建产物重启服务。
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
SELF="$SCRIPT_DIR/update.sh"

ORIGINAL_ARGS=("$@")
NO_PULL=0
SKIP_BUILD=0
RESUMED=0
MODE_OPT=""

usage() {
  cat <<'USAGE'
用法：bash update.sh [选项]

默认流程：拉取 origin/main → 校验依赖 → 备份数据库 → 构建前端 → 重启服务
          → 校验进程启动时间 → 校验 /api/health 与前端指纹。

选项：
  --help            显示本帮助
  --no-pull         跳过 git pull，但仍会 git fetch 并校验 HEAD == origin/main
  --skip-build      跳过前端构建；仅当 web/dist 不旧于前端源码时允许
  --mode=xxx        指定部署方式：docker / systemd / pm2 / none / auto
  --resumed         内部使用：脚本自身更新后重新执行时防止循环

环境变量：
  DEPLOY_MODE       默认部署方式，可被 --mode 覆盖
  PORT              健康检查端口，默认读取 .env 的 PORT，再回退 8787

校验层级：
  L1 代码   工作区干净、非 detached、HEAD 与 origin/main 完全一致
  L2 依赖   package-lock.json 变化时 npm ci，并检查 npm ls 无 missing/invalid
  L3 构建   web/dist 产物全部晚于本次构建开始，失败则恢复上一版 dist
  L4 进程   服务进程启动时间晚于构建完成时间
  L5 对外   /api/health 返回 200；首页引用本次构建的前端指纹

注意：
  - 脚本会在拉取后检查 update.sh 是否变化；变化时自动用新脚本重新执行。
  - 同一目录同时只允许一个更新进程（flock）。
  - DEPLOY_MODE=none 不会自动重启，因此无法完成 L4/L5，脚本会明确失败退出。
USAGE
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    --no-pull) NO_PULL=1 ;;
    --skip-build) SKIP_BUILD=1 ;;
    --resumed) RESUMED=1 ;;
    --mode=*)
      MODE_OPT="${1#--mode=}"
      ;;
    --mode)
      shift
      [ "$#" -gt 0 ] || { echo "--mode 需要一个值" >&2; exit 2; }
      MODE_OPT="$1"
      ;;
    *)
      echo "未知参数：$1" >&2
      echo "运行 bash update.sh --help 查看用法。" >&2
      exit 2
      ;;
  esac
  shift
done

if [ -t 1 ] && [ -z "${NO_COLOR:-}" ]; then
  C_GREEN=$'\033[1;32m'
  C_YELLOW=$'\033[1;33m'
  C_RED=$'\033[1;31m'
  C_RESET=$'\033[0m'
else
  C_GREEN=''
  C_YELLOW=''
  C_RED=''
  C_RESET=''
fi

say() { printf '\n%s→ %s%s\n' "$C_GREEN" "$*" "$C_RESET"; }
warn() { printf '%s! %s%s\n' "$C_YELLOW" "$*" "$C_RESET" >&2; }

MODE=""
SERVICE_KIND=""
DB_BACKUP=""
OLD_HEAD=""
BUILD_STAMP=""
DIST_PREV=""
DOCKER_CID=""
PROCESS_START_DESC=""

mode_log_cmd() {
  case "${1:-auto}" in
    docker) printf 'docker compose logs --tail=100\n' ;;
    pm2) printf 'pm2 logs vesta --lines 100 --nostream\n' ;;
    *) printf 'journalctl -u vesta -n 100 --no-pager\n' ;;
  esac
}

restart_cmd_hint() {
  case "${SERVICE_KIND:-${MODE:-auto}}" in
    docker) printf 'docker compose up -d --build\n' ;;
    pm2) printf 'pm2 restart vesta --update-env\n' ;;
    systemd) printf 'sudo systemctl restart vesta\n' ;;
    *) printf '手动重启 vesta 进程\n' ;;
  esac
}

dump_logs() {
  case "${SERVICE_KIND:-}" in
    systemd) journalctl -u vesta -n 60 --no-pager 2>/dev/null || true ;;
    docker) docker compose logs --tail=60 2>/dev/null || true ;;
    pm2) pm2 logs vesta --lines 60 --nostream 2>/dev/null || true ;;
    *) return 0 ;;
  esac
}

recovery_hint() {
  printf '\n可恢复信息：\n'
  printf '  失败阶段：%s\n' "${FAILED_STAGE:-未知}"
  printf '  查看日志：%s\n' "$(mode_log_cmd "${SERVICE_KIND:-${MODE:-auto}}")"
  if [ -n "${DB_BACKUP:-}" ] && [ -f "${DB_BACKUP:-}" ]; then
    printf '  数据库备份：%s\n' "$DB_BACKUP"
    printf '  恢复数据库：先停止服务，再执行 cp %s data/vesta.db，最后重启服务\n' "$DB_BACKUP"
  else
    printf '  数据库备份：本次未生成（数据库未改动或备份尚未执行）\n'
  fi
  if [ -n "${OLD_HEAD:-}" ]; then
    printf '  回滚代码（仅在确认要放弃本次更新时）：git reset --hard %s && npm ci --include=dev && npm run build\n' "$OLD_HEAD"
  else
    printf '  回滚代码：git reset --hard <更新前的 commit> && npm ci --include=dev && npm run build\n'
  fi
  printf '  重启服务：%s\n' "$(restart_cmd_hint)"
}

fail_stage() {
  local stage="$1"
  shift
  trap - ERR
  FAILED_STAGE="$stage"
  printf '\n%s× [%s] %s%s\n' "$C_RED" "$stage" "$*" "$C_RESET" >&2
  if [ "$stage" = "L4 进程" ] || [ "$stage" = "L5 对外" ]; then
    printf '\n--- 最近服务日志 ---\n' >&2
    dump_logs >&2 || true
    printf '%s\n' '--- 日志结束 ---' >&2
  fi
  recovery_hint >&2
  exit 1
}

on_error() {
  local code=$?
  trap - ERR
  FAILED_STAGE="未预期命令（第 ${BASH_LINENO[0]:-?} 行）"
  printf '\n%s× %s，退出码 %s%s\n' "$C_RED" "$FAILED_STAGE" "$code" "$C_RESET" >&2
  recovery_hint >&2
  exit "$code"
}
trap on_error ERR

# 兼容旧环境：只接受 systemd 等已有部署方式，不引入新依赖。
[ -f .env ] || {
  echo "× 缺少 .env，先执行 cp .env.example .env 并填写账号密码" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || { echo "× 没有找到 git" >&2; exit 1; }
command -v node >/dev/null 2>&1 || { echo "× 没有找到 node，需要 Node 24 或更高版本" >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "× 没有找到 npm" >&2; exit 1; }

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$NODE_MAJOR" -ge 24 ] 2>/dev/null || warn "当前 $(node -v)，建议升级到 Node 24 以上"

# 并发锁：同一目录只允许一个 update.sh 运行。自更新 exec 后沿用父进程的锁。
if [ "${VESTA_UPDATE_LOCK_HELD:-0}" != "1" ] && [ -z "${VESTA_UPDATE_LOCK_DIR:-}" ]; then
  mkdir -p data
  if command -v flock >/dev/null 2>&1; then
    exec 9>"data/update.lock"
    if ! flock -n 9; then
      echo "× 已有另一个 update.sh 正在执行（data/update.lock），本次退出。" >&2
      exit 1
    fi
    export VESTA_UPDATE_LOCK_HELD=1
  else
    LOCK_DIR="data/update.lock.d"
    if ! mkdir "$LOCK_DIR" 2>/dev/null; then
      echo "× 已有另一个 update.sh 正在执行（$LOCK_DIR），本次退出。" >&2
      exit 1
    fi
    export VESTA_UPDATE_LOCK_DIR="$LOCK_DIR"
  fi
fi

if [ -n "${VESTA_UPDATE_LOCK_DIR:-}" ]; then
  LOCK_DIR="$VESTA_UPDATE_LOCK_DIR"
  cleanup_lock() { rmdir "$LOCK_DIR" 2>/dev/null || true; }
  trap cleanup_lock EXIT
fi

env_file_value() {
  { grep -E "^${1}=" .env 2>/dev/null || true; } | tail -n 1 | cut -d= -f2-
}

MODE="${MODE_OPT:-${DEPLOY_MODE:-$(env_file_value DEPLOY_MODE)}}"
MODE="${MODE:-auto}"
case "$MODE" in
  docker|systemd|pm2|none|auto) ;;
  *) echo "× 未知的 DEPLOY_MODE：$MODE（可用：docker / systemd / pm2 / none / auto）" >&2; exit 2 ;;
esac

PORT="${PORT:-$(env_file_value PORT)}"
PORT="${PORT:-8787}"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 || {
  echo "× 当前目录不是 git 仓库：$SCRIPT_DIR" >&2
  exit 1
}

say "L1 代码：检查工作区与远程分支"
CURRENT_HEAD="$(git rev-parse HEAD)"
OLD_HEAD="${VESTA_UPDATE_OLD_HEAD:-$CURRENT_HEAD}"
OLD_SCRIPT_HASH="$(git hash-object update.sh)"

DIRTY="$(git status --porcelain)"
if [ -n "$DIRTY" ]; then
  printf '%s\n' "$DIRTY" >&2
  fail_stage "L1 代码" "工作区有未提交改动，已停止，没有覆盖任何文件。可先执行：git stash push -u -m \"update-save\"，更新完成后再 git stash pop"
fi

BRANCH="$(git symbolic-ref -q --short HEAD || true)"
if [ -z "$BRANCH" ]; then
  fail_stage "L1 代码" "当前是 detached HEAD。请先执行：git switch main"
fi
if [ "$BRANCH" != "main" ]; then
  fail_stage "L1 代码" "当前分支是 $BRANCH，不是 main。请先执行：git switch main"
fi

hash_file() {
  if [ -f "$1" ]; then
    sha256sum "$1" | awk '{print $1}'
  else
    printf 'absent\n'
  fi
}

LOCK_BEFORE="${VESTA_UPDATE_LOCK_BEFORE:-$(hash_file package-lock.json)}"
PACKAGE_BEFORE="${VESTA_UPDATE_PACKAGE_BEFORE:-$(hash_file package.json)}"

if ! git fetch --prune origin main; then
  fail_stage "L1 代码" "git fetch origin main 失败。检查网络/SSH 后重试；本次没有改动工作区"
fi
ORIGIN_HEAD="$(git rev-parse origin/main 2>/dev/null || true)"
[ -n "$ORIGIN_HEAD" ] || fail_stage "L1 代码" "无法读取 origin/main，请检查远程配置：git remote -v"

if [ "$NO_PULL" -eq 1 ]; then
  if [ "$CURRENT_HEAD" != "$ORIGIN_HEAD" ]; then
    fail_stage "L1 代码" "使用了 --no-pull，但本地 HEAD 与 origin/main 不一致。去掉 --no-pull 让脚本安全快进"
  fi
  say "--no-pull：已跳过 git pull"
else
  if ! git pull --ff-only origin main; then
    printf '\n本地与远程的差异：\n' >&2
    git log --oneline --left-right --boundary HEAD...origin/main >&2 || true
    fail_stage "L1 代码" "无法快进到 origin/main（本地与远程分叉或远程被改写）。脚本没有 reset/merge。请手动处理：git rebase origin/main 或 git merge --ff-only origin/main，确认后再运行 bash update.sh"
  fi
fi

HEAD_NOW="$(git rev-parse HEAD)"
ORIGIN_NOW="$(git rev-parse origin/main)"
if [ "$HEAD_NOW" != "$ORIGIN_NOW" ]; then
  fail_stage "L1 代码" "拉取后 HEAD 仍不等于 origin/main（HEAD=$HEAD_NOW，origin/main=$ORIGIN_NOW）"
fi

DIRTY_AFTER="$(git status --porcelain)"
if [ -n "$DIRTY_AFTER" ]; then
  printf '%s\n' "$DIRTY_AFTER" >&2
  fail_stage "L1 代码" "拉取后工作区不干净，停止更新"
fi

HEAD_SHORT="$(git rev-parse --short=12 HEAD)"
HEAD_COMMIT_TIME="$(git show -s --format=%ci HEAD)"
HEAD_SUBJECT="$(git show -s --format=%s HEAD)"
say "代码已是最新：$HEAD_SHORT  $HEAD_COMMIT_TIME"
printf '  %s\n' "$HEAD_SUBJECT"

# 如果本次拉取改了 update.sh，旧进程不能继续执行后半段旧逻辑。
if [ "$RESUMED" -eq 0 ]; then
  NEW_SCRIPT_HASH="$(git hash-object update.sh)"
  if [ "$NEW_SCRIPT_HASH" != "$OLD_SCRIPT_HASH" ]; then
    if [ ! -f "$SELF" ]; then
      fail_stage "L1 代码" "update.sh 在新版本中被删除，无法继续"
    fi
    say "update.sh 在本次更新中发生变化，重新执行新脚本"
    export VESTA_UPDATE_LOCK_HELD=1
    export VESTA_UPDATE_OLD_HEAD="$OLD_HEAD"
    export VESTA_UPDATE_LOCK_BEFORE="$LOCK_BEFORE"
    export VESTA_UPDATE_PACKAGE_BEFORE="$PACKAGE_BEFORE"
    if [ "${#ORIGINAL_ARGS[@]}" -gt 0 ]; then
      exec bash "$SELF" "${ORIGINAL_ARGS[@]}" --resumed
    else
      exec bash "$SELF" --resumed
    fi
  fi
fi

say "L2 依赖：检查 package-lock.json 与依赖树"
LOCK_AFTER="$(hash_file package-lock.json)"
PACKAGE_AFTER="$(hash_file package.json)"
if [ "$LOCK_AFTER" = "absent" ]; then
  fail_stage "L2 依赖" "缺少 package-lock.json，无法保证依赖可复现"
fi

NEED_CI=0
if [ "$LOCK_BEFORE" != "$LOCK_AFTER" ] || [ "$PACKAGE_BEFORE" != "$PACKAGE_AFTER" ]; then
  NEED_CI=1
fi
if [ ! -d node_modules ]; then
  NEED_CI=1
fi

run_npm_ci() {
  say "依赖锁定变化或依赖树不完整，执行 npm ci"
  if ! npm ci --include=dev --no-audit --no-fund; then
    fail_stage "L2 依赖" "npm ci 失败，未重启服务"
  fi
}

check_npm_tree() {
  local out code=0
  out="$(npm ls --depth=0 2>&1)" || code=$?
  if printf '%s\n' "$out" | grep -Eiq '(^|[[:space:]])(missing|invalid|unmet)([[:space:]]|$)|ELSPROBLEMS|UNMET DEPENDENCY'; then
    printf '%s\n' "$out" >&2
    return 1
  fi
  if [ "$code" -ne 0 ]; then
    warn "npm ls 退出码 $code，但没有发现 missing/invalid；按通过处理"
  fi
  return 0
}

if [ "$NEED_CI" -eq 1 ]; then
  run_npm_ci
else
  say "package-lock.json 与 package.json 未变化，跳过 npm ci"
fi

if ! check_npm_tree; then
  warn "依赖树检查未通过，尝试用 npm ci 修复"
  run_npm_ci
  if ! check_npm_tree; then
    fail_stage "L2 依赖" "npm ls 仍报告 missing/invalid，未重启服务"
  fi
fi
say "依赖检查通过：npm ls --depth=0 无 missing/invalid"

say "备份数据库"
if [ -f data/vesta.db ]; then
  mkdir -p data/backups
  DB_BACKUP="data/backups/vesta-$(date +%Y%m%d-%H%M%S).db"
  if ! node deploy/backup.mjs data/vesta.db "$DB_BACKUP"; then
    DB_BACKUP=""
    fail_stage "数据备份" "数据库备份失败，未构建、未重启服务"
  fi
  echo "已备份到 $DB_BACKUP"
  { ls -1t data/backups/vesta-*.db 2>/dev/null || true; } | tail -n +15 | xargs -r rm -f
else
  say "没有 data/vesta.db，跳过备份"
fi

mono_us() {
  if [ -r /proc/uptime ]; then
    awk '{printf "%.0f", $1 * 1000000}' /proc/uptime
  else
    printf '%s\n' "$(( $(epoch_ms) * 1000 ))"
  fi
}

# 用 Node 取毫秒时间戳，避免不同 date 实现对 %3N 的支持差异。
epoch_ms() {
  node -p 'Date.now()'
}

parse_date_ms() {
  node -e 'const t = Date.parse(process.argv[1]); console.log(Number.isFinite(t) ? t : 0)' "$1" 2>/dev/null || printf '0\n'
}

asset_of_dist() {
  grep -oE 'assets/[A-Za-z0-9._-]+\.js' web/dist/index.html 2>/dev/null | head -n 1 || true
}

restore_prev_dist() {
  if [ -n "${DIST_PREV:-}" ] && [ -d "$DIST_PREV/dist" ]; then
    rm -rf web/dist
    mv "$DIST_PREV/dist" web/dist
    say "已恢复上一版 web/dist"
  fi
  if [ -n "${DIST_PREV:-}" ]; then
    rm -rf "$DIST_PREV"
    DIST_PREV=""
  fi
  if [ -n "${BUILD_STAMP:-}" ]; then
    rm -f "$BUILD_STAMP"
    BUILD_STAMP=""
  fi
}

say "L3 构建前端"
BUILD_START_TEXT="$(date '+%F %T')"
if [ "$SKIP_BUILD" -eq 1 ]; then
  [ -f web/dist/index.html ] || fail_stage "L3 构建" "使用了 --skip-build，但 web/dist/index.html 不存在"
  NEWER_SRC="$(find web/src shared/src -type f -newer web/dist/index.html -print -quit 2>/dev/null || true)"
  for candidate in web/index.html web/vite.config.ts web/vite.config.js web/vite.config.mts; do
    if [ -e "$candidate" ] && [ "$candidate" -nt web/dist/index.html ]; then
      NEWER_SRC="$candidate"
      break
    fi
  done
  if [ -n "$NEWER_SRC" ]; then
    fail_stage "L3 构建" "源码 $NEWER_SRC 比 web/dist 新，--skip-build 会把旧前端带上线。去掉 --skip-build 重试"
  fi
  EXPECTED_ASSET="$(asset_of_dist)"
  [ -n "$EXPECTED_ASSET" ] || fail_stage "L3 构建" "web/dist/index.html 没有引用 JS 产物"
  BUILD_FINISH_MS="$(epoch_ms)"
  BUILD_FINISH_MONO_US="$(mono_us)"
  say "已跳过构建，沿用 web/dist（$EXPECTED_ASSET）"
else
  DIST_PREV="$(mktemp -d "${TMPDIR:-/tmp}/vesta-dist-prev.XXXXXX")"
  if [ -d web/dist ]; then
    mv web/dist "$DIST_PREV/dist"
  fi
  BUILD_STAMP="$(mktemp "${TMPDIR:-/tmp}/vesta-build-stamp.XXXXXX")"

  say "构建开始：$BUILD_START_TEXT"
  if ! npm run build; then
    restore_prev_dist
    fail_stage "L3 构建" "npm run build 失败，未重启服务，已尝试恢复上一版 web/dist"
  fi

  if [ ! -f web/dist/index.html ]; then
    restore_prev_dist
    fail_stage "L3 构建" "构建结束但没有生成 web/dist/index.html，未重启服务"
  fi
  EXPECTED_ASSET="$(asset_of_dist)"
  if [ -z "$EXPECTED_ASSET" ]; then
    restore_prev_dist
    fail_stage "L3 构建" "web/dist/index.html 没有引用 JS 产物，未重启服务"
  fi
  if ! find web/dist/assets -type f -print -quit 2>/dev/null | grep -q .; then
    restore_prev_dist
    fail_stage "L3 构建" "web/dist/assets 为空，未重启服务"
  fi

  OLD_FILE="$(find web/dist -type f ! -newer "$BUILD_STAMP" -print -quit 2>/dev/null || true)"
  if [ -n "$OLD_FILE" ]; then
    restore_prev_dist
    fail_stage "L3 构建" "构建产物 $OLD_FILE 的修改时间早于本次构建开始，拒绝带旧 dist 上线"
  fi

  BUILD_FINISH_MS="$(epoch_ms)"
  BUILD_FINISH_MONO_US="$(mono_us)"
  rm -rf "$DIST_PREV"
  DIST_PREV=""
  rm -f "$BUILD_STAMP"
  BUILD_STAMP=""
  say "构建完成，入口指纹：$EXPECTED_ASSET"
fi

say "L4 重启服务（$MODE）"

systemctl_priv() {
  if [ "$(id -u)" -eq 0 ]; then
    systemctl "$@"
  else
    sudo systemctl "$@"
  fi
}

pm2_start_ms() {
  if ! command -v pm2 >/dev/null 2>&1; then
    printf '0\n'
    return 0
  fi
  local raw=""
  raw="$(pm2 jlist 2>/dev/null || true)"
  printf '%s' "$raw" | node -e '
let raw = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => { raw += chunk })
process.stdin.on("end", () => {
  try {
    const list = JSON.parse(raw)
    const proc = Array.isArray(list) ? list.find((item) => item.name === "vesta") : null
    console.log(Number(proc?.pm2_env?.pm_uptime || 0))
  } catch {
    console.log(0)
  }
})
'
}

restart_docker() {
  if ! docker compose up -d --build; then
    return 1
  fi
  local -a ids=()
  mapfile -t ids < <(docker compose ps -q vesta 2>/dev/null || true)
  if [ "${#ids[@]}" -eq 0 ]; then
    mapfile -t ids < <(docker compose ps -q 2>/dev/null || true)
  fi
  DOCKER_CID="${ids[0]:-}"
  [ -n "$DOCKER_CID" ]
}

restart_service() {
  case "$SERVICE_KIND" in
    systemd)
      say "执行 systemctl restart vesta"
      systemctl_priv restart vesta
      ;;
    pm2)
      say "执行 pm2 restart vesta --update-env"
      pm2 restart vesta --update-env
      ;;
    docker)
      say "执行 docker compose up -d --build"
      restart_docker
      ;;
    *)
      return 1
      ;;
  esac
}

case "$MODE" in
  docker)
    SERVICE_KIND=docker
    ;;
  systemd)
    SERVICE_KIND=systemd
    ;;
  pm2)
    SERVICE_KIND=pm2
    ;;
  none)
    fail_stage "L4 进程" "DEPLOY_MODE=none 不会自动重启，无法验证实际运行的是最新代码。请在手动重启后改用 --mode=systemd/pm2/docker 重新校验"
    ;;
  auto)
    if { [ -f docker-compose.yml ] || [ -f compose.yaml ]; } \
      && command -v docker >/dev/null 2>&1 \
      && docker compose ps --status running 2>/dev/null | grep -q vesta; then
      SERVICE_KIND=docker
    elif command -v systemctl >/dev/null 2>&1 \
      && systemctl list-unit-files --no-legend vesta.service 2>/dev/null | grep -q '^vesta\.service'; then
      SERVICE_KIND=systemd
    elif command -v pm2 >/dev/null 2>&1 && pm2 pid vesta >/dev/null 2>&1; then
      SERVICE_KIND=pm2
    else
      fail_stage "L4 进程" "没有找到 vesta 服务。首次部署请先运行 deploy/install.sh，或手动指定 --mode=systemd/pm2/docker"
    fi
    ;;
esac

RESTART_REQUEST_MS="$(epoch_ms)"
RESTART_REQUEST_MONO_US="$(mono_us)"

if ! restart_service; then
  fail_stage "L4 进程" "重启服务失败"
fi

verify_systemd_start() {
  local deadline=$((SECONDS + 30))
  local state="" mono="" active_mono=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    state="$(systemctl show vesta -p ActiveState --value 2>/dev/null || true)"
    mono="$(systemctl show vesta -p ExecMainStartTimestampMonotonic --value 2>/dev/null || true)"
    active_mono="$(systemctl show vesta -p ActiveEnterTimestampMonotonic --value 2>/dev/null || true)"
    if ! [[ "$mono" =~ ^[0-9]+$ ]] || [ "${mono:-0}" -eq 0 ]; then
      mono="$active_mono"
    fi
    if [ "$state" = "active" ] && [[ "$mono" =~ ^[0-9]+$ ]] \
      && [ "$mono" -gt "$BUILD_FINISH_MONO_US" ] \
      && [ "$mono" -gt "$RESTART_REQUEST_MONO_US" ]; then
      PROCESS_START_DESC="$(systemctl show vesta -p ExecMainStartTimestamp --value 2>/dev/null || true)"
      return 0
    fi
    sleep 1
  done
  return 1
}

verify_pm2_start() {
  local deadline=$((SECONDS + 30))
  local started=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    started="$(pm2_start_ms)"
    if [[ "$started" =~ ^[0-9]+$ ]] \
      && [ "$started" -gt "$BUILD_FINISH_MS" ] \
      && [ "$started" -gt "$RESTART_REQUEST_MS" ]; then
      PROCESS_START_DESC="$(date -d "@$((started / 1000))" '+%F %T' 2>/dev/null || printf '%s ms' "$started")"
      return 0
    fi
    sleep 1
  done
  return 1
}

verify_docker_start() {
  local deadline=$((SECONDS + 30))
  local running="" started_at="" started_ms=""
  while [ "$SECONDS" -lt "$deadline" ]; do
    running="$(docker inspect -f '{{.State.Running}}' "$DOCKER_CID" 2>/dev/null || true)"
    started_at="$(docker inspect -f '{{.State.StartedAt}}' "$DOCKER_CID" 2>/dev/null || true)"
    started_ms="$(parse_date_ms "$started_at")"
    if [ "$running" = "true" ] && [[ "$started_ms" =~ ^[0-9]+$ ]] \
      && [ "$started_ms" -gt "$BUILD_FINISH_MS" ] \
      && [ "$started_ms" -gt "$RESTART_REQUEST_MS" ]; then
      PROCESS_START_DESC="$started_at"
      return 0
    fi
    sleep 1
  done
  return 1
}

case "$SERVICE_KIND" in
  systemd)
    if ! verify_systemd_start; then
      fail_stage "L4 进程" "30 秒内没有观察到 vesta 进程在构建完成后重新启动（systemd）"
    fi
    ;;
  pm2)
    if ! verify_pm2_start; then
      fail_stage "L4 进程" "30 秒内没有观察到 vesta 进程在构建完成后重新启动（PM2）"
    fi
    ;;
  docker)
    if ! verify_docker_start; then
      fail_stage "L4 进程" "30 秒内没有观察到 vesta 容器在构建完成后重新启动（Docker）"
    fi
    ;;
esac

say "进程启动时间：${PROCESS_START_DESC:-已确认晚于构建完成}"

say "L5 对外：健康检查与前端指纹"
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
PUBLIC_URL="http://127.0.0.1:${PORT}/"
HEALTH_OK=0
HEALTH_OUT=""
HEALTH_LAST=""
for _ in $(seq 1 30); do
  if HEALTH_OUT="$(
    HEALTH_URL="$HEALTH_URL" \
    PUBLIC_URL="$PUBLIC_URL" \
    EXPECTED_ASSET="$EXPECTED_ASSET" \
    EXPECTED_HEAD="$HEAD_SHORT" \
    RESTART_EPOCH_MS="$RESTART_REQUEST_MS" \
    node -e '
const timeout = 5000
const fail = (message) => {
  console.error(message)
  process.exit(1)
}
async function get(url) {
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeout) })
  const text = await res.text()
  return { res, text }
}
;(async () => {
  const health = await get(process.env.HEALTH_URL)
  if (health.res.status !== 200) fail(`/api/health 返回 ${health.res.status}`)
  let body
  try {
    body = JSON.parse(health.text)
  } catch {
    fail("/api/health 返回的不是 JSON")
  }
  if (!body || body.ok !== true) fail("/api/health 没有返回 ok:true")

  const healthTime = Date.parse(body.time)
  if (!Number.isFinite(healthTime)) fail("/api/health 没有可解析的 time")
  if (healthTime < Number(process.env.RESTART_EPOCH_MS) - 5000) {
    fail("/api/health 的 time 早于本次重启时间")
  }
  if (Math.abs(Date.now() - healthTime) > 180000) {
    fail("/api/health 的 time 与当前时间相差超过 3 分钟")
  }

  const versionFields = ["version", "commit", "sha", "gitSha", "git_sha", "revision"]
  let version = ""
  for (const field of versionFields) {
    if (body[field]) {
      version = String(body[field])
      break
    }
  }
  if (version) {
    const normalized = version.toLowerCase().replace(/^v/, "")
    const expected = String(process.env.EXPECTED_HEAD || "").toLowerCase()
    if (!(expected.startsWith(normalized) || normalized.startsWith(expected))) {
      fail(`/api/health 版本 ${normalized} 与 git HEAD ${expected} 不一致`)
    }
    console.log(`health 200，版本 ${normalized} 与 HEAD ${expected} 一致`)
  } else {
    console.log("health 200，但接口没有版本字段；L5 退化为 200 + 时间戳 + 前端指纹校验")
  }

  const page = await get(process.env.PUBLIC_URL)
  if (!page.res.ok) fail(`首页返回 ${page.res.status}`)
  const asset = process.env.EXPECTED_ASSET || ""
  if (asset && !page.text.includes(asset)) {
    fail(`首页没有引用本次构建的 ${asset}`)
  }
  console.log(`首页已引用本次构建产物 ${asset}，health time=${body.time}`)
})().catch((error) => fail(error?.message || String(error)))
' 2>&1
  )"; then
    HEALTH_OK=1
    break
  fi
  HEALTH_LAST="$HEALTH_OUT"
  sleep 1
done

if [ "$HEALTH_OK" -ne 1 ]; then
  printf '%s\n' "$HEALTH_LAST" >&2
  fail_stage "L5 对外" "30 秒内 /api/health 或首页指纹校验没有通过"
fi

printf '%s\n' "$HEALTH_OUT"
say "更新完成：运行的代码已校验为 origin/main 的 $HEAD_SHORT"
printf '  commit：%s %s\n' "$HEAD_SHORT" "$HEAD_COMMIT_TIME"
printf '  提交：%s\n' "$HEAD_SUBJECT"
printf '  健康检查：%s\n' "$HEALTH_URL"
if printf '%s\n' "$HEALTH_OUT" | grep -q '没有版本字段'; then
  printf '  版本校验：health 无版本字段，按 L4 进程启动时间 + 前端指纹退化校验\n'
else
  printf '  版本校验：health 返回的版本与 HEAD 一致\n'
fi
printf '  后台入口：/admin\n'
