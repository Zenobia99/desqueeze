#!/usr/bin/env bash
# Ad-hoc sign a locally-built Desqueeze.app so macOS will prompt for Photos
# access (TCC refuses to prompt for fully unsigned apps). Free — no Developer
# ID needed — but only valid on THIS Mac; not for distribution.
#
#   npm run dist:mac           # build the app + dmg first
#   bash scripts/sign-local.sh # sign the built .app, then launch it
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="${1:-$ROOT/dist/mac-arm64/Desqueeze.app}"
ENT="$ROOT/build/entitlements.mac.plist"

if [[ ! -d "$APP" ]]; then
  echo "App not found: $APP" >&2
  echo "Build it first with: npm run dist:mac" >&2
  exit 1
fi

# Clear any cached TCC denial from a previous unsigned run.
tccutil reset Photos com.desqueeze.app 2>/dev/null || true

codesign --force --deep --options runtime \
  --entitlements "$ENT" --sign - "$APP"
codesign --verify --verbose=2 "$APP"

echo
echo "✓ ad-hoc signed: $APP"
echo "Launch it, then click Favourites — macOS should now prompt for Photos access."
open "$APP"
