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


## Despliegue

Desplegado con Dokploy en VPS. Documentación Swagger disponible en: [MXWatch API](https://mxwatch-api.liuma.app/api/docs)

## Licencia

[PolyForm Noncommercial 1.0.0](LICENSE). Uso personal y no comercial; el uso comercial requiere permiso.

© 2026 Ivan Cruz
