FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

COPY src ./src
COPY tsconfig.json ./

# Build if needed, or run directly (Bun can run TS)
# But standard practice for type checking:
RUN bunx tsc --noEmit

FROM oven/bun:distroless

WORKDIR /app

COPY --from=builder /app/package.json /app/bun.lockb ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./

CMD ["bun", "run", "src/index.ts"]
