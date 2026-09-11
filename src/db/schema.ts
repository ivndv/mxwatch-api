import { relations, sql } from "drizzle-orm";
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	primaryKey,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

const timestamps = {
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
};

export const severityEnum = pgEnum("severity", [
	"low",
	"medium",
	"high",
	"critical",
]);

// 1. Catálogos maestros

// Cárteles registrados (slug y nombre ya cuentan con índice único implícito)
export const carteles = pgTable("carteles", {
	id: uuid("id").defaultRandom().primaryKey(),
	nombre: varchar("nombre", { length: 255 }).notNull().unique(),
	slug: varchar("slug", { length: 255 }).notNull().unique(),
	color: varchar("color", { length: 50 }).notNull(),
	...timestamps,
});

// Estados de la república (slug y nombre ya cuentan con índice único implícito)
export const estados = pgTable("estados", {
	id: uuid("id").defaultRandom().primaryKey(),
	nombre: varchar("nombre", { length: 255 }).notNull().unique(),
	slug: varchar("slug", { length: 255 }).notNull().unique(),
	...timestamps,
});

// Personas (jefes y operadores)
export const personas = pgTable(
	"personas",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		nombre: varchar("nombre", { length: 255 }).notNull(),
		alias: varchar("alias", { length: 255 }),
		esJefe: boolean("es_jefe").default(false).notNull(),
		cartelId: uuid("cartel_id").references(() => carteles.id, {
			onDelete: "set null",
		}),
		...timestamps,
	},
	(table) => ({
		nombreIdx: index("personas_nombre_idx").on(table.nombre),
		aliasIdx: index("personas_alias_idx").on(table.alias),
		cartelIdx: index("personas_cartel_idx").on(table.cartelId),
		// Índice parcial: indexa cartel_id solo para registros donde es_jefe sea verdadero
		jefeCartelIdx: index("personas_jefe_cartel_idx")
			.on(table.cartelId)
			.where(sql`${table.esJefe} = true`),
	}),
);

// Facciones de un cártel
export const facciones = pgTable(
	"facciones",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		nombre: varchar("nombre", { length: 255 }).notNull().unique(),
		enfoque: varchar("enfoque", { length: 255 }),
		cartelId: uuid("cartel_id")
			.notNull()
			.references(() => carteles.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => ({
		cartelIdx: index("facciones_cartel_idx").on(table.cartelId),
	}),
);

// Brazos armados de un cártel
export const brazosArmados = pgTable(
	"brazos_armados",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		nombre: varchar("nombre", { length: 255 }).notNull().unique(),
		cartelId: uuid("cartel_id")
			.notNull()
			.references(() => carteles.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => ({
		cartelIdx: index("brazos_armados_cartel_idx").on(table.cartelId),
	}),
);

// Actividades económicas (catálogo)
export const actividadesEconomicas = pgTable("actividades_economicas", {
	id: uuid("id").defaultRandom().primaryKey(),
	nombre: varchar("nombre", { length: 255 }).notNull().unique(),
	...timestamps,
});

// 2. Núcleo — Presencias (relación cartel-estado)

export const presencias = pgTable(
	"presencias",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		cartelId: uuid("cartel_id")
			.notNull()
			.references(() => carteles.id, { onDelete: "cascade" }),
		estadoId: uuid("estado_id")
			.notNull()
			.references(() => estados.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => ({
		cartelIdx: index("presencias_cartel_idx").on(table.cartelId),
		estadoIdx: index("presencias_estado_idx").on(table.estadoId),
		cartelEstadoUniq: index("presencias_cartel_estado_idx").on(
			table.cartelId,
			table.estadoId,
		),
	}),
);

// 3. Pivotes (relaciones muchos a muchos)

export const operadoresLocales = pgTable(
	"operadores_locales",
	{
		presenciaId: uuid("presencia_id")
			.notNull()
			.references(() => presencias.id, { onDelete: "cascade" }),
		personaId: uuid("persona_id")
			.notNull()
			.references(() => personas.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(t) => ({
		pk: primaryKey({ columns: [t.presenciaId, t.personaId] }),
		personaIdx: index("operadores_locales_persona_idx").on(t.personaId),
	}),
);

export const presenciasFacciones = pgTable(
	"presencias_facciones",
	{
		presenciaId: uuid("presencia_id")
			.notNull()
			.references(() => presencias.id, { onDelete: "cascade" }),
		faccionId: uuid("faccion_id")
			.notNull()
			.references(() => facciones.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(t) => ({
		pk: primaryKey({ columns: [t.presenciaId, t.faccionId] }),
		faccionIdx: index("presencias_facciones_faccion_idx").on(t.faccionId),
	}),
);

export const presenciasBrazosArmados = pgTable(
	"presencias_brazos_armados",
	{
		presenciaId: uuid("presencia_id")
			.notNull()
			.references(() => presencias.id, { onDelete: "cascade" }),
		brazoArmadoId: uuid("brazo_armado_id")
			.notNull()
			.references(() => brazosArmados.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(t) => ({
		pk: primaryKey({ columns: [t.presenciaId, t.brazoArmadoId] }),
		brazoIdx: index("presencias_brazos_armados_brazo_idx").on(t.brazoArmadoId),
	}),
);

// 4. Polimórficas (entidades flexibles)

export const alianzas = pgTable(
	"alianzas",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		nombre: varchar("nombre", { length: 255 }),
		estadoId: uuid("estado_id")
			.notNull()
			.references(() => estados.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => ({
		estadoIdx: index("alianzas_estado_idx").on(table.estadoId),
	}),
);

export const participantesAlianza = pgTable(
	"participantes_alianza",
	{
		alianzaId: uuid("alianza_id")
			.notNull()
			.references(() => alianzas.id, { onDelete: "cascade" }),
		entidadTipo: varchar("entidad_tipo", { length: 50 }).notNull(),
		entidadId: uuid("entidad_id").notNull(),
		...timestamps,
	},
	(t) => ({
		pk: primaryKey({ columns: [t.alianzaId, t.entidadTipo, t.entidadId] }),
		alianzaIdx: index("participantes_alianza_alianza_idx").on(t.alianzaId),
		tipoIdx: index("participantes_alianza_tipo_idx").on(t.entidadTipo),
	}),
);

export const entidadesActividades = pgTable(
	"entidades_actividades",
	{
		actividadId: uuid("actividad_id")
			.notNull()
			.references(() => actividadesEconomicas.id, { onDelete: "cascade" }),
		entidadTipo: varchar("entidad_tipo", { length: 50 }).notNull(),
		entidadId: uuid("entidad_id").notNull(),
		...timestamps,
	},
	(t) => ({
		pk: primaryKey({ columns: [t.actividadId, t.entidadTipo, t.entidadId] }),
		actividadIdx: index("entidades_actividades_actividad_idx").on(
			t.actividadId,
		),
		tipoIdx: index("entidades_actividades_tipo_idx").on(t.entidadTipo),
	}),
);

// 5. Incidentes (v2)

export const incidentes = pgTable(
	"incidentes",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		titulo: varchar("titulo", { length: 255 }).notNull(),
		descripcion: varchar("descripcion", { length: 1000 }).notNull(),
		severidad: severityEnum("severidad").notNull(),
		fecha: timestamp("fecha").defaultNow().notNull(),
		estadoId: uuid("estado_id")
			.notNull()
			.references(() => estados.id, { onDelete: "cascade" }),
		...timestamps,
	},
	(table) => ({
		estadoIdx: index("incidentes_estado_idx").on(table.estadoId),
		severidadIdx: index("incidentes_severidad_idx").on(table.severidad),
		fechaIdx: index("incidentes_fecha_idx").on(table.fecha),
	}),
);

// 6. Relaciones Drizzle

// --- CARTELES ---

export const cartelesRelations = relations(carteles, ({ many }) => ({
	presencias: many(presencias),
	personas: many(personas),
	facciones: many(facciones),
	brazosArmados: many(brazosArmados),
}));

// --- ESTADOS ---

export const estadosRelations = relations(estados, ({ many }) => ({
	presencias: many(presencias),
	alianzas: many(alianzas),
	incidentes: many(incidentes),
}));

// --- PERSONAS ---

export const personasRelations = relations(personas, ({ one, many }) => ({
	cartel: one(carteles, {
		fields: [personas.cartelId],
		references: [carteles.id],
	}),
	operadores: many(operadoresLocales),
}));

// --- FACCIONES ---

export const faccionesRelations = relations(facciones, ({ one, many }) => ({
	cartel: one(carteles, {
		fields: [facciones.cartelId],
		references: [carteles.id],
	}),
	presencias: many(presenciasFacciones),
}));

// --- BRAZOS ARMADOS ---

export const brazosArmadosRelations = relations(
	brazosArmados,
	({ one, many }) => ({
		cartel: one(carteles, {
			fields: [brazosArmados.cartelId],
			references: [carteles.id],
		}),
		presencias: many(presenciasBrazosArmados),
	}),
);

// --- PRESENCIAS (NÚCLEO) ---

export const presenciasRelations = relations(presencias, ({ one, many }) => ({
	cartel: one(carteles, {
		fields: [presencias.cartelId],
		references: [carteles.id],
	}),
	estado: one(estados, {
		fields: [presencias.estadoId],
		references: [estados.id],
	}),
	operadores: many(operadoresLocales),
	facciones: many(presenciasFacciones),
	brazosArmados: many(presenciasBrazosArmados),
}));

// --- ALIANZAS ---

export const alianzasRelations = relations(alianzas, ({ one, many }) => ({
	estado: one(estados, {
		fields: [alianzas.estadoId],
		references: [estados.id],
	}),
	participantes: many(participantesAlianza),
}));

// --- PIVOTES ---

export const operadoresLocalesRelations = relations(
	operadoresLocales,
	({ one }) => ({
		presencia: one(presencias, {
			fields: [operadoresLocales.presenciaId],
			references: [presencias.id],
		}),
		persona: one(personas, {
			fields: [operadoresLocales.personaId],
			references: [personas.id],
		}),
	}),
);

export const presenciasFaccionesRelations = relations(
	presenciasFacciones,
	({ one }) => ({
		presencia: one(presencias, {
			fields: [presenciasFacciones.presenciaId],
			references: [presencias.id],
		}),
		faccion: one(facciones, {
			fields: [presenciasFacciones.faccionId],
			references: [facciones.id],
		}),
	}),
);

export const presenciasBrazosArmadosRelations = relations(
	presenciasBrazosArmados,
	({ one }) => ({
		presencia: one(presencias, {
			fields: [presenciasBrazosArmados.presenciaId],
			references: [presencias.id],
		}),
		brazoArmado: one(brazosArmados, {
			fields: [presenciasBrazosArmados.brazoArmadoId],
			references: [brazosArmados.id],
		}),
	}),
);

// --- POLIMÓRFICAS (SIN RELACIONES DRIZZLE DIRECTAS) ---

export const incidentesRelations = relations(incidentes, ({ one }) => ({
	estado: one(estados, {
		fields: [incidentes.estadoId],
		references: [estados.id],
	}),
}));
