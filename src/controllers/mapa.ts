import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db";
import { carteles, estados, presencias } from "../db/schema";

interface CartelMapa {
	id: string;
	nombre: string;
	color: string;
	slug: string;
}

interface EstadoMapa {
	slug_estado: string;
	nombre_estado: string;
	carteles: CartelMapa[];
}

// Micro-caché en la memoria RAM del proceso Hono (TTL de 5 minutos)
let cacheMapa: EstadoMapa[] | null = null;
let cacheExpira = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidarCacheMapa(): void {
	cacheMapa = null;
	cacheExpira = 0;
}

// Obtiene todos los estados con su presencia de cárteles de forma optimizada
export async function obtenerMapa(c: Context) {
	try {
		const ahora = Date.now();

		// Responde de inmediato si el caché en RAM sigue vigente
		if (cacheMapa && ahora < cacheExpira) {
			return c.json(
				{
					exito: true,
					datos: cacheMapa,
					marca_tiempo: new Date(ahora).toISOString(),
				},
				200,
			);
		}

		// Consulta única con LEFT JOIN proyectando solo las columnas necesarias
		const rows = await db
			.select({
				estadoSlug: estados.slug,
				estadoNombre: estados.nombre,
				cartelId: carteles.id,
				cartelNombre: carteles.nombre,
				cartelColor: carteles.color,
				cartelSlug: carteles.slug,
			})
			.from(estados)
			.leftJoin(presencias, eq(presencias.estadoId, estados.id))
			.leftJoin(carteles, eq(carteles.id, presencias.cartelId))
			.orderBy(estados.nombre, carteles.nombre);

		// Agrupación de cárteles por estado
		const estadosMap = new Map<string, EstadoMapa>();
		for (const row of rows) {
			let estado = estadosMap.get(row.estadoSlug);
			if (!estado) {
				estado = {
					slug_estado: row.estadoSlug,
					nombre_estado: row.estadoNombre,
					carteles: [],
				};
				estadosMap.set(row.estadoSlug, estado);
			}
			if (
				row.cartelId &&
				row.cartelNombre &&
				row.cartelColor &&
				row.cartelSlug
			) {
				estado.carteles.push({
					id: row.cartelId,
					nombre: row.cartelNombre,
					color: row.cartelColor,
					slug: row.cartelSlug,
				});
			}
		}

		const result = Array.from(estadosMap.values());

		// Almacena en memoria RAM
		cacheMapa = result;
		cacheExpira = ahora + CACHE_TTL_MS;

		return c.json(
			{
				exito: true,
				datos: result,
				marca_tiempo: new Date(ahora).toISOString(),
			},
			200,
		);
	} catch (_error) {
		return c.json({ exito: false, error: "Error de base de datos" }, 500);
	}
}
