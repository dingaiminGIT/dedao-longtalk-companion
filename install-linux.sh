#!/bin/sh
set -eu
cd -- "$(dirname -- "$0")"
if ! command -v python3 >/dev/null 2>&1; then
  echo '需要 Python 3；API 模式无需本机安装。'
  exit 1
fi
python3 scripts/install.py "$@"
