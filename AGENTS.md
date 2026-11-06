# AGENTS.md — mxwatch-api

Guía operativa y técnica para agentes de IA que colaboran en el desarrollo, mantenimiento, optimización y resolución de incidencias del backend.

## 1. Visión general

**MXWatch API** es el motor central de datos y backend REST para la plataforma MXWatch. Su responsabilidad principal es consultar, gestionar y proveer toda la información estadística, geográfica e inteligencia territorial que consume el mapa táctico interactivo (`mxwatch`).

- **Propósito:** API HTTP rápida, tipada y documentada con OpenAPI/Swagger, estructurada sobre PostgreSQL y Drizzle ORM, protegida mediante autenticación server-to-server (`x-api-key`), limitación de tasa y cabeceras de seguridad.
- **Documentación en vivo (Swagger):** [http://mxwatch-api.fluxdv.icu/api/docs](http://mxwatch-api.fluxdv.icu/api/docs)
- **Repositorio:** [https://github.com/ivndv/mxwatch-api](https://github.com/ivndv/mxwatch-api)

## 2. Antes de tocar código

**CodeGraph** (índice de símbolos del repo): usa `codegraph_explore` (`query`, `maxFiles`, `projectPath`) antes de un grep masivo o de leer varios archivos; devuelve fuente verbatim, rutas de llamada e impacto.

- `codegraph sync /home/ivan/software-dev/mxwatch-api` tras editar, pull o cambiar de rama (incremental, uso normal).
- `codegraph index /home/ivan/software-dev/mxwatch-api` solo al crear el índice, tras `codegraph upgrade` o si `status` avisa `built by vX` (rebuild completo).
- `codegraph status /home/ivan/software-dev/mxwatch-api` para comprobar el estado.

## 3. Stack tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime & Gestor** | **Bun** | `v1.4.4` (`bun.lock`) |
| **Lenguaje** | **TypeScript** | Modo estricto con ESM nativo |
| **Framework API** | **Hono** | `^4.13.12` (enrutamiento de ultra alto rendimiento) |
| **Contratos & Docs** | **@hono/zod-openapi** + **@hono/swagger-ui** | `^1.6.3` / `^0.6.1` (especificación OpenAPI 3.1) |
| **Base de datos** | **PostgreSQL** | Cliente `postgres ^4.0.0` |
| **ORM & migraciones** | **Drizzle ORM** + **Drizzle Kit** | `drizzle-orm ^0.45.3`, `drizzle-kit ^0.31.11` |
| **Seguridad & rate limit** | **hono-rate-limiter** + Secure Headers | `^0.5.4` + API Key auth (`x-api-key`) |
| **Validación de datos** | **Zod 4** | `zod ^4.6.7` (DTOs y esquemas de validación) |
| **Linter & Formatter** | **Biome 2** | `@biomejs/biome ^2.6.4` (`biome.json`) |
| **Despliegue & hosting** | **Dokploy / VPS (Docker)** | Imagen `Dockerfile` con Bun `1.4.4` (non-root, `--production`, healthcheck que respeta `PORT`); deploy por webhook HTTPS autenticado con Cloudflare Access (sin SSH) |
| **CI/CD** | **GitHub Actions** | Composite `./.github/actions/setup` (Bun `1.4.4`, Node `24.22.1`, cache de `node_modules`, `--frozen-lockfile`); lint, typecheck y docker build en cada PR; deploy a Dokploy en `main` |

## 4. Estructura del código

```plaintext
mxwatch-api/
├── .github/                       → Automatización (GitHub Actions)
│   ├── actions/setup/action.yml   → Composite: Node/Bun + cache + install
│   └── workflows/ci-cd.yml        → lint/test en paralelo + deploy a Dokploy en main
├── Dockerfile                     → Imagen de producción (Bun 1.4.4, non-root, --production)
├── .dockerignore                  → Contexto de build limpio (node_modules, .git, .env*, etc.)
├── src/
│   ├── config/
│   │   ├── env.ts                 → Variables de entorno validadas (DATABASE_URL, API_KEY, PORT, CORS)
│   │   └── openapi.ts             → Metadatos generales de OpenAPI y esquema de seguridad apiKey
│   ├── controllers/               → Lógica de consulta a la base de datos y respuesta HTTP
│   │   ├── cartel.ts              → Listar cárteles y obtener detalle por slug
│   │   ├── estado.ts              → Obtener inteligencia y actividad de un estado por nombre
│   │   ├── mapa.ts                → Consulta agregada de presencia territorial para el mapa
│   │   └── salud.ts               → Verificación de salud y estado del servicio
│   ├── db/
│   │   ├── index.ts               → Inicialización del cliente PostgreSQL con Drizzle
│   │   └── schema.ts              → Esquemas de base de datos (carteles, estados, presencia, eventos, etc.)
│   ├── middlewares/
│   │   ├── auth.ts                → Verificación estricta de x-api-key (fail-closed)
│   │   ├── bodyLimit.ts           → Límite de tamaño en payloads para prevenir abusos
│   │   ├── cors.ts                → Configuración de orígenes permitidos (CORS_ORIGINS)
│   │   ├── rateLimit.ts           → Limitación de peticiones por ventana de tiempo
│   │   └── secureHeaders.ts       → Cabeceras de seguridad HTTP
│   ├── routes/                    → Definición formal de contratos OpenAPI
│   │   ├── cartel.route.ts        → Endpoints /api/cartels y /api/cartel/{slug}
│   │   ├── health.route.ts        → Endpoint /api/health
│   │   ├── map.route.ts           → Endpoint /api/map
│   │   └── state.route.ts         → Endpoint /api/state/{name}
│   ├── schemas/                   → Esquemas Zod compartidos para requests y responses
│   │   ├── cartel.ts              → DTOs de cárteles y detalles de organizaciones
│   │   ├── common.ts              → Respuestas estándar de error y paginación
│   │   ├── map.ts                 → DTOs de presencia por estado
│   │   └── state.ts               → DTOs de eventos, liderazgos e inteligencia estatal
│   └── index.ts                   → Entry point: inicialización de Hono, middlewares, Swagger y listener
├── drizzle.config.ts              → Configuración de Drizzle Kit para PostgreSQL
├── biome.json                     → Reglas de formateo y validación de Biome
└── package.json                   → Dependencias y scripts operativos con Bun
```

## 5. Arquitectura y flujo de datos

La API se compone de rutas declaradas con `@hono/zod-openapi` (`src/routes/`), controladores que consultan PostgreSQL vía Drizzle (`src/controllers/`) y esquemas Zod compartidos (`src/schemas/`). El entrypoint `src/index.ts` registra los middlewares de `src/middlewares/`: autenticación `x-api-key` (fail-closed) en rutas protegidas, límite de payload, CORS, rate limit y cabeceras de seguridad.

### 5.1 Rutas públicas (sin API Key)

- `GET /api/health`: healthcheck del servicio y verificación operativa.
- `GET /api/docs`: interfaz Swagger UI para exploración interactiva.
- `GET /api/doc`: especificación OpenAPI en formato JSON.

### 5.2 Rutas protegidas (requieren header `x-api-key`)

- `GET /api/map`: consolidado de presencia de cárteles por estado para colorear el mapa en el frontend.
- `GET /api/cartels`: catálogo maestro de cárteles y organizaciones.
- `GET /api/cartel/{slug}`: ficha técnica, liderazgos y presencia territorial de un cártel específico.
- `GET /api/state/{name}`: inteligencia detallada, eventos recientes y organizaciones activas en dicho estado.

## 6. Variables de entorno

Configuradas en `.env` (desarrollo local) o en las variables del contenedor/VPS en Dokploy:

| Variable | Descripción | Valor por defecto / ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexión a la base de datos PostgreSQL | `postgres://user:password@localhost:5432/mxwatch` |
| `API_KEY` | Clave secreta requerida en el header `x-api-key` | Token seguro alfanumérico |
| `PORT` | Puerto de escucha del servidor HTTP | `3001` |
| `CORS_ORIGINS` | Lista separada por comas de dominios autorizados | `http://localhost:3000,http://localhost:3001` |
| `API_VERSION` | Versión semántica reportada en OpenAPI | `1.0.0` |

## 7. Comandos

```bash
# Servidor de desarrollo con recarga en caliente
bun run dev

# Iniciar servidor en modo producción
bun run start

# Sincronizar esquemas Drizzle directamente a PostgreSQL
bun run db:push

# Poblar la base de datos con datos de semilla
bun run db:seed

# Verificación de tipos (sin emitir archivos)
bun run typecheck

# Diagnóstico de linter y formato con Biome
bun run check

# Corrección automática de linter y formato con Biome
bun run lint
```

## 8. Convenciones y reglas críticas

- **Gestor de paquetes exclusivo:** usa siempre **`bun`**. Nunca ejecutes `npm`, `yarn` ni `pnpm`.
- **Autenticación fail-closed:** nunca relajes la verificación de `API_KEY` en `middlewares/auth.ts` sin autorización explícita.
- **Validación OpenAPI estricta:** cualquier endpoint nuevo debe definirse primero como ruta OpenAPI con sus esquemas Zod en `src/routes/` y `src/schemas/`.
- **Seguridad transversal:** conserva `bodyLimit`, `rateLimit`, `secureHeaders` y la lista de `CORS_ORIGINS` en todas las rutas que corresponda.
- **Base de datos:** los cambios de esquema se declaran en `src/db/schema.ts` y se aplican con Drizzle Kit (`bun run db:push`).

## 9. Flujo de Git y despliegue

- **Prohibido realizar `git commit` o `git push` sin la confirmación y aprobación explícita del usuario.**
- **Ramas:** el desarrollo se realiza en `develop`; el merge a `main` solo se hace con aprobación explícita y es el que dispara el despliegue.
- **Mensajes de commit:** Conventional Commits en minúsculas y español (`feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `refactor: ...`).
- **Despliegue:** en `main`, el pipeline dispara el redeploy en Dokploy por webhook HTTPS autenticado con Cloudflare Access (sin SSH); el build Docker ocurre en el VPS.

## 10. CI/CD

Flujo: `push`/`PR` a `main`/`develop` → **lint**, **typecheck** y **docker build** en paralelo → **deploy** solo en `push` a `main`.

- Setup centralizado en la composite `./.github/actions/setup` (versiones Node/Bun + cache de `node_modules` + `--frozen-lockfile`).
- `lint` corre `bun run check` (`biome ci`, read-only) y `typecheck` corre `tsc --noEmit`.
- `docker` construye la imagen sin publicarla, para detectar fallos del `Dockerfile` antes de `main`.
- `deploy` dispara el despliegue en **Dokploy** por webhook HTTPS autenticado con Cloudflare Access (sin SSH); el build Docker ocurre en el VPS.
- Hardening: `concurrency` (cancela runs obsoletos del mismo ref) y `permissions: contents: read`.
