FROM oven/bun:1.4.2

WORKDIR /app

# 1. Solo dependencias de producción (las devDeps no se usan en runtime)
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile --production

# 2. Código fuente con propietario sin privilegios
COPY --chown=bun:bun src ./src

ENV NODE_ENV=production
EXPOSE 3001
USER bun

# 3. Healthcheck contra /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
