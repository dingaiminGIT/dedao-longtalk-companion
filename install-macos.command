#!/bin/zsh
set -e
cd -- "${0:A:h}"
# Find an existing Python installation; nothing is downloaded by this installer.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v python3 >/dev/null; then
  echo '需要 Python 3，请安装后重试。'
  read '?按回车结束。'
  exit 1
fi
python3 scripts/install.py
read '?安装完成，按回车结束。'
