import { and, eq, inArray } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db";
import { estados, personas } from "../db/schema";

// Micro-caché en RAM por estado (TTL de 5 minutos)
const cacheEstados = new Map<string, { datos: unknown; expira: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidarCacheEstados(): void {
	cacheEstados.clear();
}

// Obtiene inteligencia detallada de un estado por su nombre
export async function obtenerEstadoPorNombre(c: Context) {
	try {
		// Parámetro validado por Zod en el route
		const { name } = c.req.param() as { name: string };
		const stateName = decodeURIComponent(name);
		const ahora = Date.now();
		const cacheKey = stateName.toLowerCase();

		// Respuesta inmediata si está en caché y vigente
		const enCache = cacheEstados.get(cacheKey);
		if (enCache && ahora < enCache.expira) {
			return c.json({ exito: true, datos: enCache.datos }, 200);
		}

		// Consulta el estado con todas sus relaciones
		const stateRecord = await db.query.estados.findFirst({
			where: eq(estados.nombre, stateName),
			with: {
				presencias: {
					with: {
						cartel: true,
						facciones: { with: { faccion: true } },
						operadores: { with: { persona: true } },
						brazosArmados: { with: { brazoArmado: true } },
					},
				},
			},
		});

		// 404 si el estado no existe
		if (!stateRecord)
			return c.json({ exito: false, error: "Estado no encontrado" }, 404);

		// Obtiene únicamente los IDs de cárteles presentes en este estado
		const cartelIds = stateRecord.presencias.map((p) => p.cartel.id);

		// Consulta únicamente a los jefes de los cárteles con presencia en este estado
		const jefesPorCartel: Record<
			string,
			Array<{ id: string; nombre: string; alias: string | null }>
		> = {};

		if (cartelIds.length > 0) {
			const jefesRelevantes = await db.query.personas.findMany({
				where: and(
					eq(personas.esJefe, true),
					inArray(personas.cartelId, cartelIds),
				),
			});

			for (const j of jefesRelevantes) {
				if (j.cartelId) {
					if (!jefesPorCartel[j.cartelId]) jefesPorCartel[j.cartelId] = [];
					jefesPorCartel[j.cartelId].push({
						id: j.id,
						nombre: j.nombre,
						alias: j.alias,
					});
				}
			}
		}

		// Respuesta con carteles, facciones, operadores y brazos armados
		const datosRespuesta = {
			nombre_estado: stateRecord.nombre,
			slug_estado: stateRecord.slug,
			total_carteles: stateRecord.presencias.length,
			carteles: stateRecord.presencias.map((p) => ({
				id: p.cartel.id,
				nombre: p.cartel.nombre,
				slug: p.cartel.slug,
				color: p.cartel.color,
				jefes: (jefesPorCartel[p.cartel.id] || []).map((j) => ({
					id: j.id,
					nombre: j.nombre,
					alias: j.alias,
				})),
				facciones: p.facciones.map((f) => ({
					id: f.faccion.id,
					nombre: f.faccion.nombre,
					enfoque: f.faccion.enfoque,
				})),
				personas: p.operadores.map((l) => ({
					id: l.persona.id,
					nombre: l.persona.nombre,
					alias: l.persona.alias,
				})),
				brazos_armados:
					p.brazosArmados?.map((aw) => ({
						id: aw.brazoArmado.id,
						nombre: aw.brazoArmado.nombre,
					})) || [],
			})),
		};

		// Guarda en memoria RAM
		cacheEstados.set(cacheKey, {
			datos: datosRespuesta,
			expira: ahora + CACHE_TTL_MS,
		});

		return c.json({ exito: true, datos: datosRespuesta }, 200);
	} catch (_error) {
		return c.json({ exito: false, error: "Error de base de datos" }, 500);
	}
}
