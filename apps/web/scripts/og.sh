#!/usr/bin/env bash
# Regenerate the social share image (public/og.jpg) from the /og-card page.
# Needs a dev/preview server on :4321 (bun run --filter=@abacus/web dev).
set -euo pipefail
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="${1:-http://localhost:4321/og-card}"
DIR="$(cd "$(dirname "$0")/.." && pwd)/public"
"$CHROME" --headless=new --hide-scrollbars --disable-gpu --no-sandbox \
  --force-device-scale-factor=2 --window-size=1200,630 \
  --screenshot="$DIR/og.png" "$URL" 2>/dev/null
sips -s format jpeg -s formatOptions 84 "$DIR/og.png" --out "$DIR/og.jpg" >/dev/null
rm -f "$DIR/og.png"
echo "wrote $DIR/og.jpg"
