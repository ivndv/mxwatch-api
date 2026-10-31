FROM oven/bun:1.4.4

WORKDIR /app

# Puerto por defecto del servidor (env.PORT); puede sobreescribirse en runtime
ENV NODE_ENV=production \
    PORT=3001

# 1. Metadatos del paquete y dependencias de producción únicamente
COPY --chown=bun:bun package.json bun.lock ./

# 2. El directorio debe pertenecer al usuario sin privilegios antes de instalar
RUN chown bun:bun /app

# 3. Instala como usuario bun para que node_modules no quede en manos de root
USER bun
RUN --mount=type=cache,target=/home/bun/.bun/install/cache,uid=1000,gid=1000 \
    bun install --frozen-lockfile --production

# 4. Código fuente con propietario sin privilegios
COPY --chown=bun:bun src ./src

EXPOSE 3001

# 5. Healthcheck contra /api/health respetando el puerto configurado
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun -e "const port = process.env.PORT || 3001; fetch('http://localhost:' + port + '/api/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["bun", "run", "src/index.ts"]
