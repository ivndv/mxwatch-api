FROM oven/bun:latest

WORKDIR /app

# Dependencias con lockfile para aprovechar caché
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Configuración y código fuente
COPY drizzle.config.ts tsconfig.json ./
COPY src ./src

# Entorno y puerto
ENV NODE_ENV=production
EXPOSE 3001

# Iniciar servidor
CMD ["bun", "run", "src/index.ts"]
