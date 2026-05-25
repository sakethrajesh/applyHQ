# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

# Install deps in a separate layer for cache hits
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts

COPY frontend/ ./

ARG VITE_API_BASE=/api
ENV VITE_API_BASE=${VITE_API_BASE} \
    NODE_ENV=production

RUN npm run build \
    && rm -rf node_modules

# nginx alpine (~7MB base) — only static assets in final image
FROM nginx:1.27-alpine AS runtime

RUN rm -rf /etc/nginx/conf.d/* \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx /usr/share/nginx/html

COPY docker/web/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
