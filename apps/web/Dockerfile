# ── Stage 1: Build the Angular app ───────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /workspace

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ── Stage 2: Serve with nginx ─────────────────────────────────────────────────
FROM nginx:alpine

# Copy compiled Angular app
COPY --from=builder /workspace/dist/CustomNewTab/browser /usr/share/nginx/html

# Copy nginx configurations (HTTP and TLS variants)
COPY services/nginx/nginx.http.conf /etc/nginx/conf.d/nginx.http.conf
COPY services/nginx/nginx.tls.conf  /etc/nginx/conf.d/nginx.tls.conf

# Copy TLS-toggle entrypoint script
COPY services/nginx/docker-entrypoint.sh /docker-entrypoint.d/40-tls-toggle.sh
RUN chmod +x /docker-entrypoint.d/40-tls-toggle.sh

# Placeholder cert directory (mount real certs here when ENABLE_TLS=true)
RUN mkdir -p /etc/nginx/certs

EXPOSE 80 443
