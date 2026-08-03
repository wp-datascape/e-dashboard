# Multi-stage: stage builder (source + devDependencies + node_modules) TIDAK ikut ke image
# final — sama pola proteksi seperti backend/Dockerfile. VITE_API_URL wajib di-set sebagai
# build arg karena Vite bake env var ke bundle statis saat build, bukan saat runtime —
# artinya image prod dan dev harus dibuild TERPISAH (beda VITE_API_URL), tidak bisa reuse
# 1 image untuk kedua environment.

FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN bun run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
