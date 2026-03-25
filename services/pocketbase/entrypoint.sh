#!/bin/sh

set -e

PUID_VALUE="${PUID:-1000}"
PGID_VALUE="${PGID:-1000}"
DATA_DIR="/pb/pb_data"

mkdir -p "$DATA_DIR"
chown -R "$PUID_VALUE:$PGID_VALUE" "$DATA_DIR"

exec su-exec "$PUID_VALUE:$PGID_VALUE" ./pocketbase "$@"