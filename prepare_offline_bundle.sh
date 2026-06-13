#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_DIR="${1:-$ROOT_DIR/offline_exports}"
STAGING_DIR="$OUTPUT_DIR/staging_$TIMESTAMP"
BUNDLE_NAME="offline_bundle"
BUNDLE_DIR="$STAGING_DIR/$BUNDLE_NAME"
BUNDLE_TAR="$OUTPUT_DIR/bims-offline-bundle_$TIMESTAMP.tar.gz"
IMAGES_TAR="$OUTPUT_DIR/bims-images_$TIMESTAMP.tar"
BASE_IMAGE="python:3.13-slim"

REQUIRED_PATHS=(
  "Dockerfile"
  "docker-compose.yml"
  "manage.py"
  "requirements.txt"
  "accounts"
  "assistant"
  "barangay_ims"
  "bhw_reports"
  "dashboard"
  "residents"
  "static"
  "templates"
  "data"
)

OPTIONAL_PATHS=(
  "db.sqlite3"
  "media"
)

log() {
  printf "\n[%s] %s\n" "$(date +%H:%M:%S)" "$1"
}

fail() {
  printf "\nERROR: %s\n" "$1" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command not found: $1"
}

copy_path() {
  local source_path="$1"
  local dest_dir="$2"

  if [ -d "$source_path" ]; then
    cp -R "$source_path" "$dest_dir/"
  elif [ -f "$source_path" ]; then
    cp "$source_path" "$dest_dir/"
  else
    return 1
  fi
}

cleanup_python_cache() {
  local target_dir="$1"
  find "$target_dir" -type d -name "__pycache__" -prune -exec rm -rf {} +
  find "$target_dir" -type f -name "*.pyc" -delete
}

append_unique_image() {
  local image="$1"
  shift
  local existing
  for existing in "$@"; do
    if [ "$existing" = "$image" ]; then
      return 1
    fi
  done
  return 0
}

require_cmd docker
require_cmd tar

if ! docker compose version >/dev/null 2>&1; then
  fail "docker compose is not available. Install Docker Desktop with Compose support."
fi

mkdir -p "$OUTPUT_DIR"
rm -rf "$STAGING_DIR"
mkdir -p "$BUNDLE_DIR"

log "Stopping running project containers"
docker compose down || true

log "Building project image (ensures latest code and dependencies)"
docker compose build

log "Copying project files into staging bundle"
for path in "${REQUIRED_PATHS[@]}"; do
  copy_path "$path" "$BUNDLE_DIR" || fail "Missing required path: $path"
done

for path in "${OPTIONAL_PATHS[@]}"; do
  if ! copy_path "$path" "$BUNDLE_DIR"; then
    log "Optional path not found, skipped: $path"
  fi
done

cleanup_python_cache "$BUNDLE_DIR"
rm -rf "$BUNDLE_DIR/venv"

log "Creating offline source bundle archive"
tar -czf "$BUNDLE_TAR" -C "$STAGING_DIR" "$BUNDLE_NAME"

log "Collecting image names used by compose"
mapfile -t COMPOSE_IMAGES < <(docker compose config --images | sed '/^\s*$/d')

if [ "${#COMPOSE_IMAGES[@]}" -eq 0 ]; then
  fail "No compose images were detected."
fi

log "Ensuring base image is available locally"
docker pull "$BASE_IMAGE"

ALL_IMAGES=("$BASE_IMAGE")
for image in "${COMPOSE_IMAGES[@]}"; do
  if append_unique_image "$image" "${ALL_IMAGES[@]}"; then
    ALL_IMAGES+=("$image")
  fi
done

log "Validating local availability of images"
for image in "${ALL_IMAGES[@]}"; do
  docker image inspect "$image" >/dev/null 2>&1 || fail "Image not available locally: $image"
done

log "Saving Docker images for offline import"
docker save -o "$IMAGES_TAR" "${ALL_IMAGES[@]}"

README_FILE="$OUTPUT_DIR/OFFLINE_IMPORT_STEPS_$TIMESTAMP.txt"
cat > "$README_FILE" <<EOF
OFFLINE TRANSFER ARTIFACTS CREATED

1) Source bundle:
   $BUNDLE_TAR

2) Docker images archive:
   $IMAGES_TAR

TARGET MACHINE STEPS (OFFLINE)

1. Copy both files from USB to target machine.
2. Extract source bundle:
   tar -xzf $(basename "$BUNDLE_TAR")
3. Load images:
   docker load -i $(basename "$IMAGES_TAR")
4. Start app:
   cd $BUNDLE_NAME
   docker compose up -d --build
5. Open:
   http://127.0.0.1:8000
EOF

log "Done"
printf "\nArtifacts created:\n"
printf -- "- %s\n" "$BUNDLE_TAR"
printf -- "- %s\n" "$IMAGES_TAR"
printf -- "- %s\n" "$README_FILE"

rm -rf "$STAGING_DIR"
