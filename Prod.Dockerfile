FROM nginx:1.27-alpine

# React SPA fallback — use our routing config instead of the default
RUN rm /etc/nginx/conf.d/default.conf
COPY ops/nginx.conf /etc/nginx/conf.d/default.conf

# CI produces dist/ (vite build output) as an artifact in the workspace
COPY dist/ /usr/share/nginx/html/

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
