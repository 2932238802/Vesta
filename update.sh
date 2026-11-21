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
DIST_OPT=""

usage() {
  cat <<'USAGE'
用法：bash update.sh [选项]

默认流程：拉取 origin/main → 校验依赖 → 备份数据库 → 下载 CI 产物并原子替换 web/dist
          → 重启服务 → 校验进程启动时间 → 校验 /api/health 与前端指纹。

选项：
  --help            显示本帮助
  --no-pull         跳过 git pull，但仍会 git fetch 并校验 HEAD == origin/main
  --dist=release    前端产物来源：从 GitHub Release（tag dist）下载本次 commit 的产物（默认）
  --dist=local      应急回退：在服务器本地构建到临时目录，成功后原子替换 web/dist
  --skip-build      不下载也不构建，沿用现有 web/dist；仅当 dist 不旧于前端源码时允许
  --mode=xxx        指定部署方式：docker / systemd / pm2 / none / auto
  --resumed         内部使用：脚本自身更新后重新执行时防止循环

环境变量：
  DEPLOY_MODE       默认部署方式，可被 --mode 覆盖
  VESTA_DIST_BASE_URL  覆盖前端产物下载前缀，默认
                    https://github.com/2932238802/Vesta/releases/download/dist
  PORT              健康检查端口，默认读取 .env 的 PORT，再回退 8787

校验层级：
  L1 代码   工作区干净、非 detached、HEAD 与 origin/main 完全一致
  L2 依赖   package-lock.json 变化时 npm ci，并检查 npm ls 无 missing/invalid
  L3 产物   release：下载 web-dist-<sha>.tar.gz，校验 SHA256 与 dist-info.commit == HEAD；
            local：本地构建到临时目录；两者成功后原子替换 web/dist，失败保留上一版
  L4 进程   服务进程启动时间晚于产物就绪时间
  L5 对外   /api/health 返回 200；首页引用本次产物的前端指纹
            重启前会把本次 HEAD 写入 data/deploy-info.json，
            /api/health 的 commit 据此与 HEAD 强比对（文件缺失时降级）

注意：
  - 默认不再在服务器执行 npm run build；产物由 GitHub Actions 生成。
    产物还没生成或下载失败时，等 Actions 完成再重试，或执行 bash update.sh --dist=local。
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
    --dist=*)
      DIST_OPT="${1#--dist=}"
      ;;
    --dist)
      shift
      [ "$#" -gt 0 ] || { echo "--dist 需要一个值" >&2; exit 2; }
      DIST_OPT="$1"
      ;;
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

DIST_MODE="${DIST_OPT:-release}"
case "$DIST_MODE" in
  release|local) ;;
  *)
    echo "× 未知的 --dist：$DIST_MODE（可用：release / local）" >&2
    exit 2
    ;;
esac
# 公开 Release 的固定下载前缀；可用环境变量覆盖到镜像或本地夹具。
DIST_BASE_URL="${VESTA_DIST_BASE_URL:-https://github.com/2932238802/Vesta/releases/download/dist}"
DIST_BASE_URL="${DIST_BASE_URL%/}"

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
DIST_PREV=""
DIST_PREV_KEEP=0
DIST_TMP=""
DIST_SOURCE=""
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
  if [ -n "${OLD_HEAD:-}" ] && [ "${OLD_HEAD}" = "${HEAD_NOW:-}" ]; then
    printf '  回滚代码：本次未拉取到新提交（HEAD 仍为 %s），无需代码回滚\n' "$OLD_HEAD"
  elif [ -n "${OLD_HEAD:-}" ]; then
    printf '  回滚代码（确认要放弃本次更新时，在可 push 的仓库执行）：\n'
    printf '    git revert --no-commit %s..HEAD && git commit -m "回滚到 %s" && git push origin main\n' "$OLD_HEAD" "$OLD_HEAD"
  else
    printf '  回滚代码（确认要放弃本次更新时，在可 push 的仓库执行）：\n'
    printf '    git revert --no-commit <更新前 commit>..HEAD && git commit && git push origin main\n'
  fi
  printf '    然后在服务器执行 bash update.sh（L1 会 fast-forward 到刚推送的回滚提交）\n'
  printf '  注意：不要在服务器只做本地 git reset --hard；L1 的 git pull --ff-only 会重新快进回 origin/main，看起来回滚了但实际仍部署最新代码\n'
  printf '  回滚提示：目标 commit 的 Release 产物已被清理时，改用 bash update.sh --dist=local 应急本地构建\n'
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
if [ "$DIST_MODE" = "release" ]; then
  command -v curl >/dev/null 2>&1 || { echo "× 没有找到 curl，无法下载 CI 产物；可改用 bash update.sh --dist=local" >&2; exit 1; }
  command -v sha256sum >/dev/null 2>&1 || { echo "× 没有找到 sha256sum，无法校验 CI 产物；可改用 bash update.sh --dist=local" >&2; exit 1; }
  command -v tar >/dev/null 2>&1 || { echo "× 没有找到 tar，无法解压 CI 产物；可改用 bash update.sh --dist=local" >&2; exit 1; }
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$NODE_MAJOR" -ge 24 ] 2>/dev/null || warn "当前 $(node -v)，建议升级到 Node 24 以上"

cleanup_temp_dirs() {
  if [ -n "${DIST_TMP:-}" ] && [ -d "$DIST_TMP" ]; then
    rm -rf "$DIST_TMP"
  fi
  if [ -n "${DIST_PREV:-}" ] && [ -d "$DIST_PREV" ]; then
    # 恢复失败时保留备份，避免新旧 dist 同时丢失；成功路径会先清空 DIST_PREV。
    if [ "${DIST_PREV_KEEP:-0}" = "1" ] && [ -d "$DIST_PREV/dist" ]; then
      warn "保留上一版 web/dist 备份：$DIST_PREV（手动恢复或确认无需恢复后自行删除）"
    else
      rm -rf "$DIST_PREV"
    fi
  fi
}

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
  cleanup_lock() {
    rmdir "$LOCK_DIR" 2>/dev/null || true
    cleanup_temp_dirs
  }
  trap cleanup_lock EXIT
else
  trap cleanup_temp_dirs EXIT
fi

# INT/TERM 中断时先尝试恢复上一版 web/dist，再清理临时目录/锁；
# 只有 web/dist 缺失（替换窗口内）且备份仍完整时才恢复。
on_signal() {
  local signal="$1" code="$2"
  trap - INT TERM EXIT
  warn "收到 $signal，正在安全退出"
  if [ -n "${DIST_PREV:-}" ] && [ -d "$DIST_PREV/dist" ] && [ ! -e web/dist ]; then
    if restore_prev_dist; then
      warn "已恢复上一版 web/dist"
    else
      DIST_PREV_KEEP=1
      warn "中断时恢复上一版 web/dist 失败；旧产物保留在 $DIST_PREV，请手动恢复"
    fi
  fi
  if [ -n "${VESTA_UPDATE_LOCK_DIR:-}" ]; then
    rmdir "$LOCK_DIR" 2>/dev/null || true
  fi
  cleanup_temp_dirs
  exit "$code"
}
trap 'on_signal INT 130' INT
trap 'on_signal TERM 143' TERM

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
DATA_DIR="${DATA_DIR:-$(env_file_value DATA_DIR)}"
DATA_DIR="${DATA_DIR:-data}"

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

staged_asset_of() {
  grep -oE 'assets/[A-Za-z0-9._-]+\.js' "$1/index.html" 2>/dev/null | head -n 1 || true
}

restore_prev_dist() {
  # 只有把备份完整搬回 web/dist 且入口可读，才算恢复成功；成功后才删备份。
  if [ -z "${DIST_PREV:-}" ] || [ ! -d "$DIST_PREV/dist" ]; then
    return 1
  fi
  rm -rf web/dist || return 1
  if ! mv "$DIST_PREV/dist" web/dist; then
    return 1
  fi
  if [ ! -d web/dist ] || [ ! -f web/dist/index.html ] || [ ! -r web/dist/index.html ]; then
    return 1
  fi
  rm -rf "$DIST_PREV" || true
  DIST_PREV=""
  say "已恢复上一版 web/dist"
  return 0
}

# 把暂存目录里的 dist 原子替换到 web/dist；失败时尝试还原上一版。
# 返回：0 成功；1 前置检查/备份失败（未改动 web/dist）；2 替换失败但已恢复上一版；
#       3 替换失败且恢复失败（DIST_PREV 保留）；4 替换失败且本次无上一版可恢复。
swap_dist() {
  local next="$1" next_parent next_dev web_dev
  next_parent="$(dirname "$next")"
  next_dev="$(stat -c %d "$next_parent" 2>/dev/null || true)"
  web_dev="$(stat -c %d "$SCRIPT_DIR/web" 2>/dev/null || true)"
  if [ -z "$next_dev" ] || [ -z "$web_dev" ] || [ "$next_dev" != "$web_dev" ]; then
    warn "暂存目录与 web/ 不在同一文件系统（暂存 ${next_dev:-未知}，web ${web_dev:-未知}），无法原子替换"
    return 1
  fi

  DIST_PREV="$(mktemp -d "$SCRIPT_DIR/data/.dist-prev.XXXXXX")" || { DIST_PREV=""; return 1; }
  if [ -d web/dist ]; then
    if ! mv web/dist "$DIST_PREV/dist"; then
      rm -rf "$DIST_PREV" || true
      DIST_PREV=""
      return 1
    fi
  else
    # 没有上一版：无需备份目录，避免失败时误报“备份保留”。
    rm -rf "$DIST_PREV" || true
    DIST_PREV=""
  fi

  if ! mv "$next" web/dist; then
    if [ -z "$DIST_PREV" ]; then
      return 4
    fi
    if restore_prev_dist; then
      return 2
    fi
    DIST_PREV_KEEP=1
    return 3
  fi

  if [ -n "$DIST_PREV" ] && [ -d "$DIST_PREV" ]; then
    rm -rf "$DIST_PREV" || true
  fi
  DIST_PREV=""
  return 0
}

# 校验暂存目录里的产物：入口、assets、dist-info.commit。
validate_staged_dist() {
  local dir="$1" asset commit
  [ -f "$dir/index.html" ] || { warn "产物缺少 dist/index.html"; return 1; }
  asset="$(staged_asset_of "$dir")"
  [ -n "$asset" ] || { warn "产物 dist/index.html 没有引用 JS 产物"; return 1; }
  if ! find "$dir/assets" -type f -print -quit 2>/dev/null | grep -q .; then
    warn "产物 dist/assets 为空"
    return 1
  fi
  [ -f "$dir/dist-info.json" ] || { warn "产物缺少 dist-info.json"; return 1; }
  commit="$(INFO_FILE="$dir/dist-info.json" node -e '
const fs = require("fs")
const info = JSON.parse(fs.readFileSync(process.env.INFO_FILE, "utf8"))
process.stdout.write(String(info.commit || ""))
' 2>/dev/null)" || { warn "dist-info.json 无法解析"; return 1; }
  if [ "${commit,,}" != "${HEAD_NOW,,}" ]; then
    warn "dist-info.json 的 commit（$commit）与本次 HEAD（$HEAD_NOW）不一致"
    return 1
  fi
  return 0
}

# 下载 Release 资产；区分“资产不存在（404，多半 Actions 未完成/已清理）”
# 与“网络或服务端临时错误（可重试）”，把原因写入 DOWNLOAD_ERROR 供调用方打印。
DOWNLOAD_ERROR=""
download_dist_asset() {
  local url="$1" out="$2" http_code curl_rc=0
  DOWNLOAD_ERROR=""
  http_code="$(curl -sSL --max-time 120 --connect-timeout 10 --retry 3 --retry-delay 2 \
    -o "$out" -w '%{http_code}' "$url" 2>/dev/null)" || curl_rc=$?
  if [ "$curl_rc" -ne 0 ]; then
    DOWNLOAD_ERROR="网络错误（curl 退出码 $curl_rc），可检查网络后重试；持续失败可执行 bash update.sh --dist=local"
    return 1
  fi
  case "$http_code" in
    200) return 0 ;;
    404)
      DOWNLOAD_ERROR="HTTP 404，资产不存在：Actions 可能尚未完成，或该 commit 的资产已被清理。请确认 Actions 成功且 Release dist 中存在该资产后重试；急用可执行 bash update.sh --dist=local"
      ;;
    5??)
      DOWNLOAD_ERROR="HTTP $http_code，GitHub 服务端临时错误，可稍后重试；持续失败可执行 bash update.sh --dist=local"
      ;;
    *)
      DOWNLOAD_ERROR="HTTP $http_code，请确认 VESTA_DIST_BASE_URL 与资产名是否正确；急用可执行 bash update.sh --dist=local"
      ;;
  esac
  return 1
}

say "L3 前端产物（$DIST_MODE）"
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
  DIST_SOURCE="existing"
  BUILD_FINISH_MS="$(epoch_ms)"
  BUILD_FINISH_MONO_US="$(mono_us)"
  say "已跳过下载与构建，沿用 web/dist（$EXPECTED_ASSET）"
else
  # 暂存目录必须与 web/dist 同文件系统，最后的 mv 才是原子替换。
  mkdir -p "$SCRIPT_DIR/data"
  DIST_TMP="$(mktemp -d "$SCRIPT_DIR/data/.dist-next.XXXXXX")"
  NEXT_DIST="$DIST_TMP/dist"

  if [ "$DIST_MODE" = "local" ]; then
    say "本地构建到临时目录：$DIST_TMP（$BUILD_START_TEXT）"
    if ! npm --workspace web run build -- --outDir "$NEXT_DIST"; then
      fail_stage "L3 构建" "本地构建失败，未重启服务，web/dist 保持不变。可修复后重试，或稍后改用默认的 Release 产物"
    fi
    if ! COMMIT_SHA="$HEAD_NOW" INFO_FILE="$NEXT_DIST/dist-info.json" node -e '
const fs = require("fs")
const payload = {
  commit: process.env.COMMIT_SHA,
  version: JSON.parse(fs.readFileSync("package.json", "utf8")).version,
  builtAt: new Date().toISOString(),
  source: "local"
}
fs.writeFileSync(process.env.INFO_FILE, JSON.stringify(payload, null, 2) + "\n")
' ; then
      fail_stage "L3 构建" "无法写入 dist-info.json，未重启服务，web/dist 保持不变"
    fi
    DIST_SOURCE="local"
  else
    ASSET="web-dist-${HEAD_NOW}.tar.gz"
    ASSET_URL="${DIST_BASE_URL}/${ASSET}"
    say "下载 CI 产物：$ASSET_URL"
    if ! download_dist_asset "$ASSET_URL" "$DIST_TMP/$ASSET"; then
      fail_stage "L3 构建" "下载 $ASSET 失败：$DOWNLOAD_ERROR。本次未改动 web/dist"
    fi
    if ! download_dist_asset "${ASSET_URL}.sha256" "$DIST_TMP/$ASSET.sha256"; then
      fail_stage "L3 构建" "下载 $ASSET.sha256 失败：$DOWNLOAD_ERROR（产物可能上传不完整）。本次未改动 web/dist"
    fi
    if ! ( cd "$DIST_TMP" && sha256sum -c "$ASSET.sha256" ); then
      fail_stage "L3 构建" "SHA256 校验失败（产物不完整或与 .sha256 不一致）。本次未改动 web/dist"
    fi
    # 拒绝绝对路径或 .. 路径，避免被篡改的资产写到暂存目录之外。
    if tar -tzf "$DIST_TMP/$ASSET" | grep -Eq '(^/|(^|/)\.\.(/|$))'; then
      fail_stage "L3 构建" "产物包含不安全路径，拒绝解压。本次未改动 web/dist"
    fi
    # 拒绝符号链接/硬链接成员（tar -tv 第一列类型为 l 或 h），避免解压时跟随链接写到暂存目录之外。
    TAR_LIST="$(tar -tvzf "$DIST_TMP/$ASSET" 2>/dev/null)" \
      || fail_stage "L3 构建" "无法读取 $ASSET 的成员列表（产物损坏）。本次未改动 web/dist"
    if printf '%s\n' "$TAR_LIST" \
      | awk '$1 ~ /^[lh]/ { found = 1 } END { exit(found ? 0 : 1) }'; then
      fail_stage "L3 构建" "产物包含符号链接或硬链接成员，拒绝解压。本次未改动 web/dist"
    fi
    if ! tar -xzf "$DIST_TMP/$ASSET" -C "$DIST_TMP"; then
      fail_stage "L3 构建" "解压 $ASSET 失败。本次未改动 web/dist"
    fi
    DIST_SOURCE="release:$ASSET"
  fi

  if ! validate_staged_dist "$NEXT_DIST"; then
    fail_stage "L3 构建" "暂存产物校验未通过，拒绝上线。本次未改动 web/dist"
  fi
  EXPECTED_ASSET="$(staged_asset_of "$NEXT_DIST")"

  SWAP_RC=0
  swap_dist "$NEXT_DIST" || SWAP_RC=$?
  case "$SWAP_RC" in
    0) ;;
    2) fail_stage "L3 构建" "原子替换 web/dist 失败，已恢复上一版，未上线新产物" ;;
    3) fail_stage "L3 构建" "原子替换 web/dist 失败且恢复上一版失败；旧产物保留在 ${DIST_PREV:-未知路径}，请手动恢复。新产物仍在本次暂存目录中" ;;
    4) fail_stage "L3 构建" "原子替换 web/dist 失败（本次原本没有上一版 web/dist 可恢复）" ;;
    *) fail_stage "L3 构建" "原子替换 web/dist 失败（暂存目录检查或备份上一版失败），web/dist 未被改动" ;;
  esac

  BUILD_FINISH_MS="$(epoch_ms)"
  BUILD_FINISH_MONO_US="$(mono_us)"
  say "已替换 web/dist，来源：$DIST_SOURCE，入口指纹：$EXPECTED_ASSET"
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

DEPLOY_INFO_FILE="$DATA_DIR/deploy-info.json"
mkdir -p "$DATA_DIR"
if ! DEPLOY_INFO_FILE="$DEPLOY_INFO_FILE" HEAD_SHORT="$HEAD_SHORT" DIST_SOURCE="$DIST_SOURCE" node -e '
const fs = require("fs")
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"))
const payload = {
  commit: process.env.HEAD_SHORT || "",
  deployedAt: new Date().toISOString(),
  productVersion: pkg.version || "",
  distSource: process.env.DIST_SOURCE || ""
}
const file = process.env.DEPLOY_INFO_FILE
fs.writeFileSync(file + ".tmp", JSON.stringify(payload, null, 2) + "\n")
fs.renameSync(file + ".tmp", file)
'; then
  fail_stage "L4 进程" "无法写入 $DEPLOY_INFO_FILE，/api/health 将无法证明运行版本"
fi
say "已写入部署元数据：$DEPLOY_INFO_FILE（commit $HEAD_SHORT）"

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
printf '  前端产物：%s（%s）\n' "$DIST_SOURCE" "$EXPECTED_ASSET"
printf '  健康检查：%s\n' "$HEALTH_URL"
if printf '%s\n' "$HEALTH_OUT" | grep -q '没有版本字段'; then
  printf '  版本校验：health 无版本字段，按 L4 进程启动时间 + 前端指纹退化校验\n'
else
  printf '  版本校验：health 返回的版本与 HEAD 一致\n'
fi
printf '  后台入口：/admin\n'
