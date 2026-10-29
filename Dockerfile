# One container for both halves: the site is built to static files and the API
# is compiled to JavaScript, then a small Node server serves both on one port.
FROM node:24-alpine AS build

WORKDIR /app

# The workspace manifests first, so a source-only change does not reinstall.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY tsconfig.json ./
COPY backend backend
COPY frontend frontend

RUN npm run build --workspace frontend
RUN npm run build --workspace backend

# Keep only what the server imports at runtime.
RUN npm prune --omit=dev

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8443 \
    STATIC_ROOT=./public

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/frontend/dist ./public

USER node

EXPOSE 8443

CMD ["node", "backend/dist/server.js"]
