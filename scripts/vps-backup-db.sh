#!/bin/bash
# Backup Postgres prod & dev di VPS (docker-compose, bukan Neon — lihat task019.md).
# Dijalankan via cron di server, BUKAN dari mesin lokal. Pakai pg_dump lewat
# `docker exec` langsung ke container, tidak perlu port di-publish/tunnel apa pun.
#
# Retensi: simpan 7 backup harian terakhir per environment, yang lebih lama
# otomatis dihapus.

set -euo pipefail

BACKUP_DIR="/home/deploy/db-backups"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

backup_one() {
  local env_name="$1"
  local container="$2"
  local out_file="$BACKUP_DIR/${env_name}-${TIMESTAMP}.sql.gz"

  if ! docker ps --format '{{.Names}}' | grep -qx "$container"; then
    echo "[$env_name] SKIP — container $container tidak jalan"
    return
  fi

  docker exec "$container" pg_dump -U dashboard e_dashboard | gzip > "$out_file"
  echo "[$env_name] OK — $out_file ($(du -h "$out_file" | cut -f1))"
}

backup_one "prod" "e-dashboard-prod-db"
backup_one "dev" "e-dashboard-dev-db"

echo "Hapus backup lebih tua dari $RETENTION_DAYS hari..."
find "$BACKUP_DIR" -name '*.sql.gz' -mtime "+$RETENTION_DAYS" -delete -print

echo "Backup selesai: $(date)"
