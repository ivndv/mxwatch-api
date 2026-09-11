import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { db } from "../db";
import { carteles } from "../db/schema";

interface CartelItem {
	id: string;
	nombre: string;
	slug: string;
	color: string;
}

interface ListaCartelesData {
	exito: true;
	datos: CartelItem[];
	conteo: number;
}

interface DetalleCartelData {
	id: string;
	nombre: string;
	slug: string;
	color: string;
	presencia: {
		estados: Array<{ nombre_estado: string }>;
		total_estados: number;
	};
	facciones: Array<{ nombre: string; enfoque: string | null; id?: string }>;
	personas: Array<{ nombre: string; alias: string | null; id?: string }>;
	brazos_armados: Array<{ nombre: string; id?: string }>;
}

interface DetalleCartelRespuesta {
	exito: true;
	datos: DetalleCartelData;
}

// Micro-caché en RAM (TTL de 5 minutos)
let cacheListaCarteles: ListaCartelesData | null = null;
let expiraListaCarteles = 0;
const cacheDetalleCartel = new Map<
	string,
	{ datos: DetalleCartelRespuesta; expira: number }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export function invalidarCacheCarteles(): void {
	cacheListaCarteles = null;
	expiraListaCarteles = 0;
	cacheDetalleCartel.clear();
}

// Lista todos los cárteles ordenados por nombre
export async function listarCarteles(c: Context) {
	try {
		const ahora = Date.now();
		if (cacheListaCarteles && ahora < expiraListaCarteles) {
			return c.json(cacheListaCarteles, 200);
		}

		const allCarteles = await db.query.carteles.findMany({
			orderBy: (carteles, { asc }) => [asc(carteles.nombre)],
		});

		const respuesta: ListaCartelesData = {
			exito: true as const,
			datos: allCarteles.map((cr) => ({
				id: cr.id,
				nombre: cr.nombre,
				slug: cr.slug,
				color: cr.color,
			})),
			conteo: allCarteles.length,
		};

		cacheListaCarteles = respuesta;
		expiraListaCarteles = ahora + CACHE_TTL_MS;

		return c.json(respuesta, 200);
	} catch (_error) {
		return c.json({ exito: false, error: "Error de base de datos" }, 500);
	}
}

// Obtiene detalle de un cártel por slug con presencia, facciones y estructura
export async function obtenerCartelPorSlug(c: Context) {
	try {
		// Parámetro validado por Zod en el route
		const { slug } = c.req.param() as { slug: string };
		const ahora = Date.now();
		const cacheKey = slug.toLowerCase();

		const enCache = cacheDetalleCartel.get(cacheKey);
		if (enCache && ahora < enCache.expira) {
			return c.json(enCache.datos, 200);
		}

		// Consulta el cártel con todas sus relaciones
		const cartelRecord = await db.query.carteles.findFirst({
			where: eq(carteles.slug, slug),
			with: {
				presencias: {
					with: {
						estado: true,
						facciones: { with: { faccion: true } },
						operadores: { with: { persona: true } },
						brazosArmados: { with: { brazoArmado: true } },
					},
				},
			},
		});

		// 404 si el cártel no existe
		if (!cartelRecord)
			return c.json({ exito: false, error: "Cártel no encontrado" }, 404);

		// Deduplica facciones, líderes y brazos armados del cártel
		const uniqueFactions = new Map();
		const uniqueLeaders = new Map();
		const uniqueArmedWings = new Map();
		const statePresence: Array<{ nombre_estado: string }> = [];

		cartelRecord.presencias.forEach((presence) => {
			statePresence.push({ nombre_estado: presence.estado.nombre });
			presence.facciones.forEach((pf) => {
				uniqueFactions.set(pf.faccion.id, {
					nombre: pf.faccion.nombre,
					enfoque: pf.faccion.enfoque,
				});
			});
			presence.operadores.forEach((pl) => {
				uniqueLeaders.set(pl.persona.id, {
					nombre: pl.persona.nombre,
					alias: pl.persona.alias,
				});
			});
			presence.brazosArmados?.forEach((aw) => {
				uniqueArmedWings.set(aw.brazoArmado.id, {
					nombre: aw.brazoArmado.nombre,
				});
			});
		});

		// Respuesta con presencia, facciones, personas y brazos armados
		const datosRespuesta: DetalleCartelRespuesta = {
			exito: true as const,
			datos: {
				id: cartelRecord.id,
				nombre: cartelRecord.nombre,
				slug: cartelRecord.slug,
				color: cartelRecord.color,
				presencia: {
					estados: statePresence,
					total_estados: statePresence.length,
				},
				facciones: Array.from(uniqueFactions.values()),
				personas: Array.from(uniqueLeaders.values()),
				brazos_armados: Array.from(uniqueArmedWings.values()),
			},
		};

		cacheDetalleCartel.set(cacheKey, {
			datos: datosRespuesta,
			expira: ahora + CACHE_TTL_MS,
		});

		return c.json(datosRespuesta, 200);
	} catch (_error) {
		return c.json({ exito: false, error: "Error de base de datos" }, 500);
	}
}
