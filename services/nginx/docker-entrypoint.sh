#!/bin/sh
# Runs early in the nginx Docker entrypoint pipeline.
# Selects HTTP or TLS nginx configuration based on ENABLE_TLS and cert presence.

set -e

CERT=/etc/nginx/certs/cert.pem
KEY=/etc/nginx/certs/key.pem
HTTP_CONF=/etc/nginx/custom/nginx.http.conf
TLS_CONF=/etc/nginx/custom/nginx.tls.conf
DEFAULT_CONF=/etc/nginx/conf.d/default.conf

if [ "${ENABLE_TLS}" = "true" ] && [ -s "$CERT" ] && [ -s "$KEY" ]; then
    echo "[custom-new-tab] TLS enabled — activating HTTPS configuration"
    cp "$TLS_CONF" "$DEFAULT_CONF"
else
    if [ "${ENABLE_TLS}" = "true" ]; then
        echo "[custom-new-tab] ENABLE_TLS=true but cert/key not found or empty — falling back to HTTP"
    else
        echo "[custom-new-tab] TLS disabled — activating HTTP configuration"
    fi
    cp "$HTTP_CONF" "$DEFAULT_CONF"
fi
