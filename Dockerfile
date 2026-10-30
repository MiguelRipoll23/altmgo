# The backend container only: the Hono app is compiled to JavaScript and served
# over plain HTTP on 8443. The site itself is deployed separately on Vercel and reaches
# this container at http://raspberrypi.tailbb45e2.ts.net:8443.
#
# The image is built from this repository
# (`docker build -t altmgo-backend:latest .`) and loaded into k3s's containerd,
# so it is referenced by a local tag and never pulled.
#
# The Deployment reads a secret named mgo2-web-secrets with two keys:
#   DATABASE_URL  a standard postgresql:// URL (the game's Postgres)
#   JWT_SECRET    a value of this site's own, e.g. `openssl rand -hex 32`
# Create it before applying, for example:
#   kubectl -n altmgo create secret generic altmgo-secrets \
#     --from-literal=DATABASE_URL='postgresql://user:password@mgo2-postgres:5432/mgo2' \
#     --from-literal=JWT_SECRET="$(openssl rand -hex 32)"
FROM node:24-alpine AS build

WORKDIR /app

# The workspace manifests first, so a source-only change does not reinstall.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci

COPY tsconfig.json ./
COPY backend backend

RUN npm run build --workspace backend

# Keep only what the server imports at runtime.
RUN npm prune --omit=dev

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production \
    PORT=8443

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json

USER node

EXPOSE 8443

CMD ["node", "backend/dist/server.js"]
