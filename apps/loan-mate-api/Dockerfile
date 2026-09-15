# Multi-stage Dockerfile for Cloud Run (build from apps/loan-mate-api context)
# Usage from repo root:
#   docker build -f apps/loan-mate-api/Dockerfile apps/loan-mate-api -t loan-mate-api
#
# After changing package.json, refresh this image lockfile with:
#   pnpm --dir apps/loan-mate-api install --ignore-workspace --lockfile-only --config.minimumReleaseAge=0

FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
COPY package.json pnpm-lock.yaml ./
# pnpm 11 defaults minimumReleaseAge=1440; without these, install/exec hangs on
# "Verifying lockfile against supply-chain policies".
RUN printf '%s\n' \
    'packages:' \
    "  - '.'" \
    'dangerouslyAllowAllBuilds: true' \
    'minimumReleaseAge: 0' \
    'trustLockfile: true' \
    > pnpm-workspace.yaml \
  && pnpm install --frozen-lockfile

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
RUN corepack enable && corepack prepare pnpm@11.6.0 --activate
COPY . .
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
ENV DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/loan_mate?schema=public"
ENV DIRECT_DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/loan_mate?schema=public"
RUN pnpm exec prisma generate
RUN pnpm exec nest build

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S app && adduser -S app -G app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
USER app
EXPOSE 8080
ENV PORT=8080
# API default. Worker Cloud Run job (`loan-mate-worker`): override command to
# node dist/worker.main.js (runs once and exits).
CMD ["node", "dist/main.js"]
