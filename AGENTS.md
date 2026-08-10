# Agent Instructions

## Project Structure

This is a monorepo managed with pnpm workspaces and Nx.

- `apps/step-up` — Next.js frontend
- `apps/step-up-api` — NestJS backend
- `packages/` — Shared libraries

## Security Rules

### Never access, read, print, modify, or expose:
- `.env` files or any file matching `*.env*`
- Firebase service-account JSON files
- Production credentials or API keys
- Private keys, access tokens, database passwords
- Cloud provider credentials (R2, AWS, etc.)

### Environment configuration
- Use `.env.example` files when you need to understand required environment variables
- Reference variable **names** in code, never actual values
- Never run commands that dump environment variables (e.g. `printenv`, `env`, `cat .env`)

### If you need to understand auth/config structure
- Read the config module code (e.g. `config/` directories)
- Check `.env.example` for variable names
- Inspect type definitions and interfaces
- Do NOT read actual secret values

### Forbidden bash patterns
- `cat .env*`
- `printenv` / `env`
- `echo $SECRET_VAR`
- Any command that dumps credentials or secrets

## Code Style

- TypeScript throughout
- Biome for formatting/linting
- NestJS conventions for the API
- Next.js conventions for the frontend
