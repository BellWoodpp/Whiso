#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v zip >/dev/null 2>&1; then
  echo "Error: zip is required." >&2
  exit 1
fi

VERSION="$(
  node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('manifest.json','utf8'));process.stdout.write(String(m.version||''))"
)"

if [[ -z "${VERSION}" ]]; then
  echo "Error: failed to read version from manifest.json" >&2
  exit 1
fi

OUT="whois-domain-date-extension-${VERSION}.zip"

INCLUDE=(
  "manifest.json"
  "background.js"
  "content.js"
  "README.md"
  "README.ja.md"
  "PRIVACY.md"
  "docs/privacy-policy.html"
  "icons"
  "_locales"
)

for p in "${INCLUDE[@]}"; do
  if [[ ! -e "$p" ]]; then
    echo "Error: missing required path: $p" >&2
    exit 1
  fi
done

rm -f "$OUT"
zip -r -X -9 "$OUT" "${INCLUDE[@]}"
echo "Wrote: $OUT"
