# Multi-stage Dockerfile for Cloud Run (build from apps/step-up-api context)
# Usage from repo root:
#   docker build -f apps/step-up-api/Dockerfile apps/step-up-api -t step-up-api

FROM node:24-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
COPY package.json ./
# pnpm 11 defaults minimumReleaseAge=1440; without these, install/exec hangs on
# "Verifying lockfile against supply-chain policies".
RUN printf '%s\n' \
    'packages:' \
    "  - '.'" \
    'dangerouslyAllowAllBuilds: true' \
    'minimumReleaseAge: 0' \
    'trustLockfile: true' \
    > pnpm-workspace.yaml \
  && pnpm install --no-frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
RUN pnpm exec prisma generate
RUN pnpm exec nest build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
USER app
EXPOSE 8080
ENV PORT=8080
# API default. Worker Cloud Run service: override command to
# ["node", "dist/worker.main.js"] (requires REDIS_URL).
CMD ["node", "dist/main.js"]
