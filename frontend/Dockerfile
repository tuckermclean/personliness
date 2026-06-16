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
# Copy only package.json (not the lockfile) so npm resolves the correct
# platform-specific native binaries for the build arch. The committed
# package-lock.json only records one platform's optional deps, so npm ci /
# npm install against it fail on arm64 with "Cannot find module
# @rollup/rollup-linux-arm64-musl". See npm/cli#4828.
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
