FROM nginx:1.27-alpine

# React SPA fallback — use our routing config instead of the default
RUN rm /etc/nginx/conf.d/default.conf
COPY ops/nginx.conf /etc/nginx/conf.d/default.conf

# CI produces dist/ (vite build output) as an artifact in the workspace
COPY dist/ /usr/share/nginx/html/

EXPOSE 80

# Healthcheck so the deploy pipeline can wait for nginx to actually serve.
# Without this, `docker inspect <c> .State.Health.Status` returns empty and
# the CI's `until ... grep -q healthy` loop times out at 60s.
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
