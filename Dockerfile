FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

# Build if needed, or run directly (Bun can run TS)
# But standard practice for type checking:
RUN bunx tsc --noEmit

# Production stage
# Use alpine for a balance of size and compatibility (has shell)
FROM oven/bun:1-alpine

WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lockb ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

# Run via npm script 'start' to ensure consistent behavior
CMD ["bun", "run", "start"]
