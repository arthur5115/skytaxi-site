#!/bin/sh
cd "$(dirname "$0")" || exit 1
printf '%s
' 'Open http://127.0.0.1:8000/index.html in your browser.'
exec python3 -m http.server 8000 --bind 127.0.0.1
