FROM node:22-alpine AS dev

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ── Production build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
# Use `npm install` (not `npm ci`) so the platform-specific native binaries
# (e.g. @rollup/rollup-linux-arm64-musl) are resolved for the build arch.
# The committed lockfile only records one platform's optional deps — npm ci
# would fail on arm64. See npm/cli#4828.
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
