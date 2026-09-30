# AGENTS.md — Guía para Agentes en MXWatch API

Guía operativa y técnica para agentes de Inteligencia Artificial que colaboren en el desarrollo, mantenimiento, optimización y resolución de incidencias en el backend de **MXWatch API**.

---

## 1. Visión General del Proyecto

**MXWatch API** es el motor central de datos y backend REST para la plataforma MXWatch. Su responsabilidad principal es consultar, gestionar y proveer toda la información estadística, geográfica e inteligencia territorial que consume el mapa táctico interactivo (`mxwatch`).

* **Propósito:** Proveer una API HTTP rápida, tipada y documentada con OpenAPI/Swagger, estructurada sobre PostgreSQL y Drizzle ORM, protegida mediante autenticación server-to-server (`x-api-key`), limitación de tasa (rate limiting) y cabeceras de seguridad.
* **Documentación en Vivo (Swagger):** [http://mxwatch-api.fluxdv.icu/api/docs](http://mxwatch-api.fluxdv.icu/api/docs)
* **Repositorio:** [https://github.com/Ivandv19/mxwatch-api](https://github.com/Ivandv19/mxwatch-api)

---

## 2. Antes de Tocar Código

* **Uso del MCP CodeGraph:** Antes de realizar búsquedas a ciegas o exploración masiva de archivos, utiliza la herramienta `codegraph_explore` para inspeccionar el flujo de llamadas y el código fuente verbatim de los controladores, schemas y modelos en una sola llamada eficiente.
* **Estado y Sincronización:**
  ```bash
  # Verificar el estado del índice de CodeGraph
  codegraph status /home/ivan/software-dev/mxwatch-api

  # Sincronizar cambios en el árbol de archivos
  codegraph sync /home/ivan/software-dev/mxwatch-api
  ```

---

## 3. Stack Tecnológico

| Capa | Tecnología | Versión / Detalle |
| :--- | :--- | :--- |
| **Runtime & Gestor** | **Bun** | `v1.4.2` (`bun.lock`) |
| **Lenguaje** | **TypeScript** | Modo estricto con ESM nativo |
| **Framework API** | **Hono** | `^4.13.12` (enrutamiento de ultra alto rendimiento) |
| **Contratos & Docs** | **@hono/zod-openapi** + **@hono/swagger-ui** | `^1.6.3` / `^0.6.1` (especificación OpenAPI 3.1) |
| **Base de Datos** | **PostgreSQL** | Cliente `postgres ^3.4.9` |
| **ORM & Migraciones** | **Drizzle ORM** + **Drizzle Kit** | `drizzle-orm ^0.45.3`, `drizzle-kit ^0.31.11` |
| **Seguridad & Rate Limit** | **hono-rate-limiter** + Secure Headers | `^0.5.4` + API Key auth (`x-api-key`) |
| **Validación de Datos** | **Zod 4** | `zod ^4.6.5` (DTOs y esquemas de validación) |
| **Linter & Formatter** | **Biome 2** | `@biomejs/biome ^2.5.15` (`biome.json`) |
| **Despliegue & Hosting** | **Dokploy / VPS (Docker)** + **Cloudflare Wrangler** | Imagen `Dockerfile` con Bun `1.4.2` (non-root, `--production`, healthcheck); trigger de deploy por SSH desde CI (`wrangler ^4.145.0`) |
| **CI/CD** | **GitHub Actions** | Composite `./.github/actions/setup` (Bun `1.4.2`, Node `24.19.0`, cache de `node_modules`); lint/test y deploy a Dokploy en `main` |

---

## 4. Estructura del Código

```
mxwatch-api/
├── .github/                       → Automatización (GitHub Actions)
│   ├── actions/setup/action.yml   → Composite: Node/Bun + cache + install
│   └── workflows/ci-cd.yml        → lint/test en paralelo + deploy a Dokploy en main
├── Dockerfile                     → Imagen de producción (Bun 1.4.2, non-root, --production)
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
├── package.json                   → Dependencias y scripts operativos con Bun
└── wrangler.jsonc                 → Configuración de bindings en caso de despliegue a Workers
```

---

## 5. Endpoints y Arquitectura de la API

### 🌐 Rutas Públicas (Sin API Key)
* `GET /api/health`: Healthcheck del servicio y verificación operativa.
* `GET /api/docs`: Interfaz Swagger UI para exploración interactiva.
* `GET /api/doc`: Especificación OpenAPI en formato JSON.

### 🔐 Rutas Protegidas (Requieren Header `x-api-key`)
* `GET /api/map`: Retorna el consolidado de presencia de cárteles por estado para colorear el mapa en el frontend.
* `GET /api/cartels`: Retorna el catálogo maestro de cárteles y organizaciones.
* `GET /api/cartel/{slug}`: Retorna la ficha técnica, liderazgos y presencia territorial de un cártel específico.
* `GET /api/state/{name}`: Retorna la inteligencia detallada, eventos recientes y organizaciones activas en dicho estado.

---

## 6. Variables de Entorno

Configuradas en `.dev.vars` (desarrollo local) o en las variables del contenedor/VPS en Dokploy:

| Variable | Descripción | Valor por Defecto / Ejemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexión a la base de datos PostgreSQL | `postgres://user:password@localhost:5432/mxwatch` |
| `API_KEY` | Clave secreta requerida en el header `x-api-key` | Token seguro alfanumérico |
| `PORT` | Puerto de escucha del servidor HTTP | `3001` |
| `CORS_ORIGINS` | Lista separada por comas de dominios autorizados | `http://localhost:3000,http://localhost:3001` |
| `API_VERSION` | Versión semántica reportada en OpenAPI | `1.0.0` |

---

## 7. Comandos Operativos (Bun)

```bash
# Servidor de desarrollo con recarga en caliente
bun run dev

# Iniciar servidor en modo producción
bun run start

# Sincronizar esquemas Drizzle directamente a PostgreSQL
bun run db:push

# Poblar la base de datos con datos de semilla
bun run db:seed

# Desplegar a Cloudflare Workers con Wrangler
bun run deploy

# Generar tipos de bindings de Cloudflare
bun run cf-typegen

# Diagnóstico de linter y formato con Biome
bun run check

# Corrección automática de linter y formato con Biome
bun run lint
```

---

## 8. CI/CD (GitHub Actions)

Flujo: `push`/`PR` a `main`/`develop` → **lint** y **test** en paralelo → **deploy** solo en `push` a `main`.

* Setup centralizado en la composite `./.github/actions/setup` (versiones Node/Bun + cache de `node_modules`).
* `lint` corre `bun run check` (read-only); `test` corre `bun run test` (placeholder mientras no haya suite).
* `deploy` dispara el despliegue en **Dokploy** por SSH; el build Docker ocurre en el VPS.
* Hardening: `concurrency` (cancela runs obsoletos del mismo ref) y `permissions: contents: read`.

---

## 9. Reglas Críticas para Agentes

1. **Gestor de Paquetes Exclusivo:** Utiliza siempre **`bun`**. Nunca ejecutes `npm`, `yarn` ni `pnpm`.
2. **Autenticación Fail-Closed:** Nunca relajes la verificación de `API_KEY` en `middlewares/auth.ts` sin autorización explícita.
3. **Validación OpenAPI Estricta:** Cualquier endpoint nuevo debe definirse primero como ruta OpenAPI con sus schemas de Zod en `src/routes/` y `src/schemas/`.
4. **Flujo de Git:** **NO realices `git commit` ni `git push` sin la confirmación explícita del usuario**.
5. **Sincronización de CodeGraph:** Tras crear, editar o renombrar controladores, esquemas o rutas, ejecuta `codegraph sync /home/ivan/software-dev/mxwatch-api`.
