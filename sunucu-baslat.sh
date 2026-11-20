#!/usr/bin/env bash
# Pazarkule KİBA - yerel test sunucusu (macOS / Linux)
# Kullanım: ./sunucu-baslat.sh   →  http://localhost:8000
cd "$(dirname "$0")" || exit 1
python3 -m http.server 8000
