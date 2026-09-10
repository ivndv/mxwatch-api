// Dependencias Hono
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono } from "@hono/zod-openapi";
import { logger } from "hono/logger";

// Configuración
import { env } from "./config/env";
import { OPENAPI_INFO, SECURITY_SCHEME } from "./config/openapi";

// Controllers
import { listarCarteles, obtenerCartelPorSlug } from "./controllers/cartel";
import { obtenerEstadoPorNombre } from "./controllers/estado";
import { obtenerMapa } from "./controllers/mapa";
import { verificarSalud } from "./controllers/salud";

// Middleware
import { authMiddleware } from "./middlewares/auth";
import { aplicarBodyLimit } from "./middlewares/bodyLimit";
import { aplicarCors } from "./middlewares/cors";
import { aplicarRateLimit } from "./middlewares/rateLimit";
import { aplicarSecureHeaders } from "./middlewares/secureHeaders";

// Rutas registradas
import { getCartelBySlugRoute, listCartelsRoute } from "./routes/cartel.route";
import { healthRoute } from "./routes/health.route";
import { mapRoute } from "./routes/map.route";
import { getStateByNameRoute } from "./routes/state.route";

const app = new OpenAPIHono();
const api = new OpenAPIHono();

// Rutas públicas que no requieren API Key
const PUBLIC_ROUTES = ["/api/health", "/api/docs", "/api/doc"];

// Logger de peticiones
app.use("*", logger());

// Seguridad: headers, body limit y rate limiting
aplicarSecureHeaders(app);
aplicarBodyLimit(app);
aplicarRateLimit(app);

// CORS con orígenes permitidos
aplicarCors(app);

// Autenticación por API Key (fail-closed)
api.use("*", async (c, next) => {
	if (PUBLIC_ROUTES.includes(c.req.path)) return await next();
	return await authMiddleware(c, next);
});

// Registro de endpoints OpenAPI
api.openapi(healthRoute, verificarSalud);
api.openapi(mapRoute, obtenerMapa);
api.openapi(listCartelsRoute, listarCarteles);
api.openapi(getCartelBySlugRoute, obtenerCartelPorSlug);
api.openapi(getStateByNameRoute, obtenerEstadoPorNombre);

// Esquema de seguridad para Swagger
app.openAPIRegistry.registerComponent(
	"securitySchemes",
	"apiKey",
	SECURITY_SCHEME,
);

// Ruta de bienvenida pública
app.get("/", (c) =>
	c.json({
		nombre: "mxwatch-api",
		version: env.API_VERSION,
		estado: "activo",
		docs: "/api/docs",
	}),
);

// Ensamblado final con documentación y error handler
const appConRutas = app
	.route("/api", api)
	.doc("/api/doc", OPENAPI_INFO)
	.get("/api/docs", swaggerUI({ url: "/api/doc" }))
	.onError((err, c) => {
		console.error("Error no capturado:", err);
		return c.json({ exito: false, error: "Error interno del servidor" }, 500);
	});

console.log(
	`🚀 mxwatch-api v${env.API_VERSION} corriendo en http://localhost:${env.PORT}`,
);
console.log(`📖 Documentación Swagger: http://localhost:${env.PORT}/api/docs`);

export type AppType = typeof appConRutas;

export default {
	port: env.PORT,
	fetch: appConRutas.fetch,
};
