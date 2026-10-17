#!/usr/bin/env bash
# =====================================================================
#  نشر tfkir.net على Cloudflare Pages
#  ---------------------------------------------------------------
#  1) node tools/build.mjs      → يولّد الصفحات في جذر المشروع
#  2) node tools/stage.mjs DIR  → يجهّز مجلد نشر نظيفًا
#  3) wrangler pages deploy     → يرفع إلى Cloudflare
#
#  الاستعمال:
#     export CLOUDFLARE_API_TOKEN=...
#     export CLOUDFLARE_ACCOUNT_ID=...
#     bash tools/deploy.sh
# =====================================================================
set -euo pipefail

NAME="${PAGES_PROJECT:-tfkir}"
BRANCH="${PAGES_BRANCH:-main}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="${STAGE_DIR:-/tmp/tfkir-site}"

: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN غير مضبوط}"
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-bd85cec7bed4765fff87432395561386}"

echo "→ 1/3  بناء الموقع"
node "$ROOT/tools/build.mjs" | head -2

echo "→ 2/3  تجهيز مجلد النشر"
node "$ROOT/tools/stage.mjs" "$STAGE"

echo "→ 3/3  الرفع إلى Cloudflare Pages"
npx --yes wrangler@4 pages deploy "$STAGE" \
  --project-name="$NAME" \
  --branch="$BRANCH" \
  --commit-dirty=true \
  --commit-message="$(git -C "$ROOT" log -1 --pretty=%s 2>/dev/null || echo deploy)"

echo
echo "  ✓ الموقع:  https://$NAME.pages.dev"
echo "  ✓ النطاق:  https://tfkir.net   (بعد ربطه بالمشروع)"