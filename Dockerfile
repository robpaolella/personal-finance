# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/client/package.json ./packages/client/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci

COPY . .

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client
RUN npm run build --workspace=packages/server


# Stage 2: Production
FROM node:20-alpine

LABEL org.opencontainers.image.title="Ledger"
LABEL org.opencontainers.image.description="Self-hosted personal finance tracking for households"
LABEL org.opencontainers.image.source="https://github.com/robpaolella/ledger"
LABEL org.opencontainers.image.license="MIT"

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/server/package.json ./packages/server/
COPY packages/shared/package.json ./packages/shared/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/client/dist ./packages/client/dist
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist

RUN mkdir -p /app/packages/server/data

EXPOSE 3001

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health || exit 1

CMD ["node", "packages/server/dist/index.js"]
