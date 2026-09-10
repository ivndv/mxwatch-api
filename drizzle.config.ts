import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Carga de variables de entorno según el entorno de ejecución:
 * En producción se priorizan las variables del sistema (Dokploy / VPS).
 * En desarrollo local se utiliza el archivo .env.local o .env.
 */
const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.local";
config({ path: envFile });

// Validación de integridad: DATABASE_URL es indispensable para migraciones y operaciones de esquema
if (!process.env.DATABASE_URL) {
	throw new Error(
		"❌ DATABASE_URL no definida en las variables de entorno. Verifica tu archivo .env o la configuración de Dokploy.",
	);
}

/**
 * Configuración principal de Drizzle Kit para MXWatch API
 * Define la ruta del esquema de datos relacional, salida de migraciones y conexión a PostgreSQL.
 */
export default defineConfig({
	// Esquema fuente de la base de datos (source of truth)
	schema: "./src/db/schema.ts",

	// Directorio de salida donde se generan las migraciones SQL
	out: "./drizzle",

	// Dialecto de base de datos relacional
	dialect: "postgresql",

	// Credenciales de conexión a PostgreSQL obtenidas de variables de entorno
	dbCredentials: {
		url: process.env.DATABASE_URL,
	},

	// Configuración de visualización y validación estricta para prevenir pérdida accidental de datos
	verbose: true,
	strict: true,

	// Configuración de control interno de migraciones
	migrations: {
		table: "__drizzle_migrations",
		schema: "public",
	},
});

/**
 * Configuración auxiliar para seeding:
 * Permite poblar la base de datos con datos iniciales para pruebas o despliegues iniciales.
 */
export const seedConfig = {
	connectionString: process.env.DATABASE_URL,
	seed: "./src/db/seed.ts",
};
