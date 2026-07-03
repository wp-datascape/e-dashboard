# Render tidak punya runtime Bun native di dropdown Language (cuma Docker, Elixir,
# Node, Go, Python3, Ruby, Rust) — jadi pakai image resmi Bun lewat Docker.
#
# Multi-stage: stage builder yang punya source/devDependencies/node_modules TIDAK
# ikut ke image final. Image final cuma berisi satu file dist/index.js hasil
# bundle+obfuscate (lihat scripts/build-prod.ts) — staff dengan akses shell ke
# container yang jalan tidak akan menemukan source .ts sama sekali.

FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1
WORKDIR /app
COPY --from=builder /app/dist/index.js ./index.js
CMD ["bun", "index.js"]
