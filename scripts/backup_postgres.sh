#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/bims_${TIMESTAMP}.dump"
BACKUP_FILE_TMP="${BACKUP_FILE}.tmp"

cleanup_tmp() {
    rm -f "${BACKUP_FILE_TMP}"
}

trap cleanup_tmp ERR

mkdir -p "${BACKUP_DIR}"

cd "${PROJECT_DIR}"

if [[ ! -f ".env" ]]; then
    echo "Error: .env file was not found."
    exit 1
fi

set -a
source .env
set +a

docker compose \
    -f docker-compose.prod.yml \
    exec -T db \
    pg_dump \
    --username="${POSTGRES_USER}" \
    --dbname="${POSTGRES_DB}" \
    --format=custom \
    --no-owner \
    --no-acl \
    > "${BACKUP_FILE_TMP}"

mv "${BACKUP_FILE_TMP}" "${BACKUP_FILE}"
trap - ERR

find "${BACKUP_DIR}" \
    -type f \
    -name "bims_*.dump" \
    -mtime +30 \
    -delete

echo "Backup created:"
echo "${BACKUP_FILE}"
