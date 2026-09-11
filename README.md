# MXWatch API

## Descripción

API central de datos para la plataforma MXWatch. Provee servicios de consulta y gestión de información territorial, presencia de organizaciones por estado, perfiles analíticos y eventos geográficos en todo el país.

## Características

- **Documentación OpenAPI**: Especificación OpenAPI y Swagger UI interactivo integrados de forma nativa con validación por Zod.
- **Seguridad y Resiliencia**: Autenticación por cabecera `x-api-key`, rate limiting por IP, cabeceras seguras y límite de tamaño en peticiones.
- **Consultas Relacionales**: Acceso a datos y esquemas tipados mediante Drizzle ORM sobre PostgreSQL.
- **Alto Rendimiento**: Construido sobre Hono y Bun para respuestas ágiles y bajo consumo de memoria.

## Endpoints

- `GET /api/health`: Estado del servicio.
- `GET /api/map`: Información territorial consolidada para el mapa.
- `GET /api/cartels`: Catálogo de organizaciones y niveles de presencia territorial.
- `GET /api/cartel/:slug`: Perfil detallado de una organización por su identificador.
- `GET /api/state/:name`: Detalle territorial y organizaciones por entidad federativa.
- `GET /api/docs`: Documentación interactiva Swagger UI.

## Uso

Las rutas de datos requieren enviar una clave de API en la cabecera HTTP:

```http
x-api-key: tu_api_key_aqui
```

Las rutas `/api/health`, `/api/docs` y `/api/doc` son de acceso público sin autenticación.

## Tecnologías Utilizadas

- **Runtime**: Bun
- **Framework**: Hono, @hono/zod-openapi, @hono/swagger-ui
- **Base de Datos & ORM**: PostgreSQL, Drizzle ORM
- **Validación**: Zod
- **Seguridad**: hono-rate-limiter
- **Linter & Formateo**: Biome, TypeScript
- **Contenedor**: Docker

## Instalación

1. **Clonar el Repositorio**:

```bash
git clone https://github.com/ivndv/mxwatch-api.git
```

2. **Instalar Dependencias**:

```bash
bun install
```

3. **Variables de Entorno**: Crea un archivo `.env` en la raíz (puedes guiarte con `.env.example`):

```env
DATABASE_URL=postgresql://postgres:password@127.0.0.1:5432/mxwatch_db
API_KEY=tu_api_key_aqui
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
PORT=3001
API_VERSION=1.0.0
```

4. **Iniciar el Servidor**:

```bash
# Servidor de desarrollo con recarga en caliente:
bun run dev

# Aplicar cambios de esquema a la base de datos:
bun run db:push

# Cargar datos iniciales:
bun run db:seed
```

## Despliegue

Desplegado con Dokploy en VPS. Documentación Swagger disponible en: [mxwatch-api](http://mxwatch-api.fluxdv.icu/api/docs)

## Licencia

Licencia de Uso Personal:

Este software es propiedad de **Ivan Cruz**. Se permite el uso de este software solo para fines personales y no comerciales. No se permite la distribución, modificación ni uso comercial de este software sin el consentimiento expreso de **Ivan Cruz**.

Cualquier uso no autorizado puede resultar en acciones legales.
