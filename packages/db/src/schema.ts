/**
 * Esquema de JURIFIS sobre PostgreSQL 16 con Drizzle ORM.
 *
 * Dos capas de datos conviven aqui y no deben confundirse:
 *
 * 1. Capa multiinquilino: todo lo que contiene datos de cliente. Cada tabla
 *    lleva org_id con llave foranea a organizations y queda bajo Row Level
 *    Security (ver src/rls.sql). Es materia de secreto profesional.
 * 2. Capa de catalogo: autoridades, procedimientos, reglas de plazo,
 *    calendarios, dias inhabiles, fuentes y criterios jurisprudenciales. Es
 *    conocimiento juridico compartido, sin org_id y sin RLS.
 *
 * Regla dura del proyecto: este archivo define estructura, nunca contenido
 * juridico. No hay articulos, plazos, tesis, registros ni fechas oficiales
 * escritos como valores por omision. Todo dato juridico entra por migracion
 * de datos verificada contra fuente de Nivel A.
 */

import { relations, sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';

/* -------------------------------------------------------------------------- */
/* Enumeraciones                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Rol dentro de una organizacion. superadmin es rol de plataforma: administra
 * cuentas, planes y soporte. No abre expedientes ajenos, ver src/rls.sql.
 */
export const rolMembresia = pgEnum('rol_membresia', [
  'superadmin',
  'owner',
  'admin',
  'abogado',
  'asistente',
  'cliente',
]);

/** Etapa procesal del expediente en el juicio contencioso administrativo. */
export const estadoExpediente = pgEnum('estado_expediente', [
  'nuevo',
  'en_analisis',
  'plazo_corriendo',
  'demanda_presentada',
  'contestacion',
  'alegatos',
  'sentencia',
  'cumplimiento',
  'concluido',
]);

/** Naturaleza del criterio guardado en la tabla jurisprudence. */
export const tipoCriterio = pgEnum('tipo_criterio', [
  'jurisprudencia',
  'tesis_aislada',
  'precedente',
  'sentencia',
  'criterio_administrativo',
  'legislacion',
]);

/** A: texto oficial integro y vigente. B: derivado, resumen o pagina no oficial. */
export const nivelFuente = pgEnum('nivel_fuente', ['A', 'B']);

/**
 * Confianza del computo de plazos, identica a la del motor de @jurifis/core.
 * insuficiente y bloqueada_por_fuente no devuelven fecha de vencimiento.
 */
export const confianzaComputo = pgEnum('confianza_computo', [
  'verificada',
  'parcial',
  'insuficiente',
  'bloqueada_por_fuente',
]);

/* -------------------------------------------------------------------------- */
/* Identidad y organizacion                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Inquilino. Es la raiz del aislamiento: el valor de app.org_id que la
 * aplicacion fija por transaccion apunta siempre a un renglon de esta tabla.
 */
export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull(),
    nombre: text('nombre').notNull(),
    razonSocial: text('razon_social'),
    rfc: text('rfc'),
    correoContacto: text('correo_contacto'),
    telefono: text('telefono'),
    zonaHoraria: text('zona_horaria').notNull().default('America/Mexico_City'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    borradoEn: timestamp('borrado_en', { withTimezone: true }),
  },
  (t) => [uniqueIndex('organizations_slug_key').on(t.slug)],
);

/**
 * Identidad de la persona. Global y sin org_id a proposito: una misma persona
 * puede pertenecer a varios despachos. El vinculo, y con el el rol y el
 * alcance de lectura, vive en memberships.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    correo: text('correo').notNull(),
    nombre: text('nombre').notNull(),
    telefono: text('telefono'),
    hashContrasena: text('hash_contrasena'),
    cedulaProfesional: text('cedula_profesional'),
    verificadoEn: timestamp('verificado_en', { withTimezone: true }),
    ultimoAccesoEn: timestamp('ultimo_acceso_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    borradoEn: timestamp('borrado_en', { withTimezone: true }),
  },
  (t) => [uniqueIndex('users_correo_key').on(t.correo)],
);

/** Pertenencia de un usuario a una organizacion, con su rol. */
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    rol: rolMembresia('rol').notNull(),
    activo: boolean('activo').notNull().default(true),
    invitadoEn: timestamp('invitado_en', { withTimezone: true }),
    aceptadoEn: timestamp('aceptado_en', { withTimezone: true }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('memberships_org_user_key').on(t.orgId, t.userId),
    index('memberships_user_idx').on(t.userId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Catalogo juridico compartido                                               */
/* -------------------------------------------------------------------------- */

/**
 * Fuente cruda de la que se lee el derecho aplicable. El sha256 es la alarma:
 * si el archivo cambia sin que cambie el hash declarado, la fuente deja de ser
 * confiable y todo lo que se apoya en ella baja de nivel.
 */
export const legalSources = pgTable(
  'legal_sources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clave: text('clave').notNull(),
    titulo: text('titulo').notNull(),
    ordenamiento: text('ordenamiento'),
    nivel: nivelFuente('nivel').notNull(),
    publicacionDof: text('publicacion_dof'),
    fechaPublicacion: date('fecha_publicacion'),
    vigenteDesde: date('vigente_desde'),
    vigenteHasta: date('vigente_hasta'),
    url: text('url'),
    rutaArchivo: text('ruta_archivo'),
    sha256: text('sha256'),
    verificadoEn: timestamp('verificado_en', { withTimezone: true }),
    verificadoPor: uuid('verificado_por').references(() => users.id, { onDelete: 'set null' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('legal_sources_clave_key').on(t.clave), index('legal_sources_nivel_idx').on(t.nivel)],
);

/** Autoridad emisora del acto impugnado. Catalogo compartido, sin org_id. */
export const authorities = pgTable(
  'authorities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clave: text('clave').notNull(),
    nombre: text('nombre').notNull(),
    /** federal, estatal o municipal. Texto libre para no cerrar el catalogo. */
    ambito: text('ambito'),
    entidadFederativa: text('entidad_federativa'),
    dependencia: text('dependencia'),
    domicilio: text('domicilio'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('authorities_clave_key').on(t.clave)],
);

/** Procedimiento o via: juicio de nulidad, recurso de revocacion, amparo y demas. */
export const procedures = pgTable(
  'procedures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clave: text('clave').notNull(),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    materia: text('materia'),
    ordenamiento: text('ordenamiento'),
    fuenteId: uuid('fuente_id').references(() => legalSources.id, { onDelete: 'set null' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('procedures_clave_key').on(t.clave)],
);

/**
 * Regla de plazo, espejo en base de datos de las reglas que @jurifis/core lee
 * de disco. La clave debe coincidir con el identificador de la regla del motor
 * para que un plazo guardado pueda recalcularse igual anios despues.
 */
export const legalRules = pgTable(
  'legal_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clave: text('clave').notNull(),
    procedimientoId: uuid('procedimiento_id').references(() => procedures.id, { onDelete: 'set null' }),
    descripcion: text('descripcion').notNull(),
    /** Cantidad y unidad del plazo. Sin valor por omision: es dato juridico. */
    cantidad: integer('cantidad').notNull(),
    unidad: text('unidad').notNull(),
    primerDia: text('primer_dia').notNull(),
    prorrogaSiVenceInhabil: boolean('prorroga_si_vence_inhabil').notNull(),
    incluyeDiaVencimiento: boolean('incluye_dia_vencimiento').notNull(),
    /** Identificadores de calendarios que la regla exige, arreglo json. */
    calendarios: jsonb('calendarios').notNull(),
    /** Reglas de surtimiento de efectos por forma de notificacion. */
    surtimiento: jsonb('surtimiento').notNull(),
    /** Ordenamiento, articulo, fraccion, publicacion y archivo de lectura. */
    fundamento: jsonb('fundamento').notNull(),
    fuenteId: uuid('fuente_id').references(() => legalSources.id, { onDelete: 'set null' }),
    nivel: nivelFuente('nivel').notNull(),
    vigenteDesde: date('vigente_desde'),
    vigenteHasta: date('vigente_hasta'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('legal_rules_clave_key').on(t.clave),
    index('legal_rules_procedimiento_idx').on(t.procedimientoId),
  ],
);

/** Calendario anual de dias inhabiles de un organo u ordenamiento. */
export const holidayCalendars = pgTable(
  'holiday_calendars',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clave: text('clave').notNull(),
    nombre: text('nombre').notNull(),
    ambito: text('ambito'),
    anio: integer('anio').notNull(),
    nivel: nivelFuente('nivel').notNull(),
    fuenteId: uuid('fuente_id').references(() => legalSources.id, { onDelete: 'set null' }),
    publicadoEn: date('publicado_en'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('holiday_calendars_clave_key').on(t.clave), index('holiday_calendars_anio_idx').on(t.anio)],
);

/** Dia inhabil concreto dentro de un calendario. */
export const holidays = pgTable(
  'holidays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    calendarioId: uuid('calendario_id')
      .notNull()
      .references(() => holidayCalendars.id, { onDelete: 'cascade' }),
    fecha: date('fecha').notNull(),
    motivo: text('motivo'),
    fundamento: jsonb('fundamento'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('holidays_calendario_fecha_key').on(t.calendarioId, t.fecha)],
);

/**
 * Acervo de criterios: jurisprudencia, tesis, precedentes, sentencias,
 * criterios administrativos y legislacion. El campo verificado es el candado
 * de citacion: ningun escrito cita un renglon con verificado en falso.
 */
export const jurisprudence = pgTable(
  'jurisprudence',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tipoCriterio: tipoCriterio('tipo_criterio').notNull(),
    rubro: text('rubro').notNull(),
    texto: text('texto').notNull(),
    organo: text('organo'),
    epoca: text('epoca'),
    registroDigital: text('registro_digital'),
    materia: text('materia'),
    precedentes: text('precedentes'),
    claveControl: text('clave_control'),
    instancia: text('instancia'),
    fechaPublicacion: date('fecha_publicacion'),
    fuenteId: uuid('fuente_id').references(() => legalSources.id, { onDelete: 'set null' }),
    nivel: nivelFuente('nivel').notNull(),
    verificado: boolean('verificado').notNull().default(false),
    verificadoEn: timestamp('verificado_en', { withTimezone: true }),
    verificadoPor: uuid('verificado_por').references(() => users.id, { onDelete: 'set null' }),
    /** Vector de pgvector para busqueda semantica. Requiere create extension vector. */
    embedding: vector('embedding', { dimensions: 1536 }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('jurisprudence_registro_digital_key').on(t.registroDigital),
    index('jurisprudence_tipo_idx').on(t.tipoCriterio),
    index('jurisprudence_embedding_idx').using('hnsw', t.embedding.op('vector_cosine_ops')),
  ],
);

/* -------------------------------------------------------------------------- */
/* Datos de cliente, bajo RLS                                                 */
/* -------------------------------------------------------------------------- */

/** Cliente del despacho. */
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    /** fisica o moral. Texto libre para no forzar la clasificacion al alta. */
    tipoPersona: text('tipo_persona'),
    rfc: text('rfc'),
    correo: text('correo'),
    telefono: text('telefono'),
    domicilio: jsonb('domicilio'),
    representanteLegal: text('representante_legal'),
    notas: text('notas'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    borradoEn: timestamp('borrado_en', { withTimezone: true }),
  },
  (t) => [index('clients_org_idx').on(t.orgId), uniqueIndex('clients_org_rfc_key').on(t.orgId, t.rfc)],
);

/** Expediente. */
export const cases = pgTable(
  'cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id')
      .notNull()
      .references(() => clients.id, { onDelete: 'restrict' }),
    numeroExpediente: text('numero_expediente'),
    caratula: text('caratula').notNull(),
    estado: estadoExpediente('estado').notNull().default('nuevo'),
    materia: text('materia'),
    autoridadId: uuid('autoridad_id').references(() => authorities.id, { onDelete: 'set null' }),
    procedimientoId: uuid('procedimiento_id').references(() => procedures.id, { onDelete: 'set null' }),
    sala: text('sala'),
    /** Cuantia del asunto. Numeric para no perder centavos. */
    cuantia: numeric('cuantia', { precision: 18, scale: 2 }),
    moneda: text('moneda').notNull().default('MXN'),
    responsableId: uuid('responsable_id').references(() => users.id, { onDelete: 'set null' }),
    abiertoEn: date('abierto_en'),
    cerradoEn: date('cerrado_en'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    borradoEn: timestamp('borrado_en', { withTimezone: true }),
  },
  (t) => [
    index('cases_org_idx').on(t.orgId),
    index('cases_cliente_idx').on(t.clienteId),
    uniqueIndex('cases_org_numero_key').on(t.orgId, t.numeroExpediente),
  ],
);

/** Actuacion o hecho registrado en el expediente. Linea de tiempo. */
export const caseEvents = pgTable(
  'case_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    casoId: uuid('caso_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    tipo: text('tipo').notNull(),
    titulo: text('titulo').notNull(),
    descripcion: text('descripcion'),
    ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull(),
    registradoPor: uuid('registrado_por').references(() => users.id, { onDelete: 'set null' }),
    metadatos: jsonb('metadatos'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('case_events_org_idx').on(t.orgId), index('case_events_caso_fecha_idx').on(t.casoId, t.ocurridoEn)],
);

/**
 * Plazo computado. Guarda el resultado y ademas todo lo necesario para
 * reproducirlo: la clave de la regla, el calendario que se uso, la traza paso
 * a paso y las fuentes. Si el calendario del proximo anio se corrige, el
 * computo historico sigue siendo auditable tal como se emitio.
 */
export const deadlines = pgTable(
  'deadlines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    casoId: uuid('caso_id')
      .notNull()
      .references(() => cases.id, { onDelete: 'cascade' }),
    /** Clave de la regla de @jurifis/core con la que se calculo. */
    reglaClave: text('regla_clave').notNull(),
    reglaId: uuid('regla_id').references(() => legalRules.id, { onDelete: 'set null' }),
    /** Calendario principal de dias inhabiles que se aplico. */
    calendarioId: uuid('calendario_id').references(() => holidayCalendars.id, { onDelete: 'set null' }),
    calendarioClave: text('calendario_clave').notNull(),
    /** Claves de todos los calendarios que entraron al computo. */
    calendariosUsados: jsonb('calendarios_usados').notNull().default(sql`'[]'::jsonb`),
    descripcion: text('descripcion'),
    formaNotificacion: text('forma_notificacion'),
    fechaNotificacion: date('fecha_notificacion').notNull(),
    surteEfectos: date('surte_efectos'),
    inicioComputo: date('inicio_computo'),
    vence: date('vence'),
    /** Traza paso a paso del motor. Es la defensa del computo ante el cliente. */
    traza: jsonb('traza').notNull().default(sql`'[]'::jsonb`),
    fuentes: jsonb('fuentes').notNull().default(sql`'[]'::jsonb`),
    faltantes: jsonb('faltantes').notNull().default(sql`'[]'::jsonb`),
    advertencias: jsonb('advertencias').notNull().default(sql`'[]'::jsonb`),
    inhabilesAplicados: jsonb('inhabiles_aplicados').notNull().default(sql`'[]'::jsonb`),
    confianza: confianzaComputo('confianza').notNull(),
    /** Version del motor que produjo la traza, para reproducir el calculo. */
    motorVersion: text('motor_version'),
    calculadoEn: timestamp('calculado_en', { withTimezone: true }).notNull().defaultNow(),
    cumplidoEn: timestamp('cumplido_en', { withTimezone: true }),
    creadoPor: uuid('creado_por').references(() => users.id, { onDelete: 'set null' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('deadlines_org_idx').on(t.orgId),
    index('deadlines_caso_idx').on(t.casoId),
    index('deadlines_vence_idx').on(t.vence),
  ],
);

/** Aviso al usuario. El guardian de terminos fatales escribe aqui. */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    casoId: uuid('caso_id').references(() => cases.id, { onDelete: 'cascade' }),
    plazoId: uuid('plazo_id').references(() => deadlines.id, { onDelete: 'cascade' }),
    canal: text('canal').notNull(),
    asunto: text('asunto').notNull(),
    cuerpo: text('cuerpo'),
    estado: text('estado').notNull().default('pendiente'),
    programadaPara: timestamp('programada_para', { withTimezone: true }),
    enviadaEn: timestamp('enviada_en', { withTimezone: true }),
    leidaEn: timestamp('leida_en', { withTimezone: true }),
    error: text('error'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('notifications_org_idx').on(t.orgId),
    index('notifications_user_estado_idx').on(t.userId, t.estado),
  ],
);

/** Documento del expediente. El binario vive en el almacen, aqui la referencia. */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    casoId: uuid('caso_id').references(() => cases.id, { onDelete: 'cascade' }),
    clienteId: uuid('cliente_id').references(() => clients.id, { onDelete: 'set null' }),
    nombre: text('nombre').notNull(),
    tipo: text('tipo'),
    mime: text('mime'),
    tamanoBytes: bigint('tamano_bytes', { mode: 'number' }),
    /** Huella del archivo. Si cambia sin aviso, el documento dejo de ser el mismo. */
    sha256: text('sha256').notNull(),
    rutaAlmacenamiento: text('ruta_almacenamiento').notNull(),
    paginas: integer('paginas'),
    textoExtraido: text('texto_extraido'),
    subidoPor: uuid('subido_por').references(() => users.id, { onDelete: 'set null' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
    borradoEn: timestamp('borrado_en', { withTimezone: true }),
  },
  (t) => [
    index('documents_org_idx').on(t.orgId),
    index('documents_caso_idx').on(t.casoId),
    uniqueIndex('documents_org_sha256_key').on(t.orgId, t.sha256),
  ],
);

/** Prospecto captado por la organizacion, previo a volverse cliente. */
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    nombre: text('nombre').notNull(),
    correo: text('correo'),
    telefono: text('telefono'),
    origen: text('origen'),
    mensaje: text('mensaje'),
    estado: text('estado').notNull().default('nuevo'),
    convertidoClienteId: uuid('convertido_cliente_id').references(() => clients.id, { onDelete: 'set null' }),
    atendidoPor: uuid('atendido_por').references(() => users.id, { onDelete: 'set null' }),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('leads_org_estado_idx').on(t.orgId, t.estado)],
);

/** Suscripcion comercial de la organizacion. */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    plan: text('plan').notNull(),
    estado: text('estado').notNull(),
    proveedor: text('proveedor'),
    proveedorSuscripcionId: text('proveedor_suscripcion_id'),
    periodoInicio: timestamp('periodo_inicio', { withTimezone: true }),
    periodoFin: timestamp('periodo_fin', { withTimezone: true }),
    canceladaEn: timestamp('cancelada_en', { withTimezone: true }),
    limiteUsuarios: integer('limite_usuarios'),
    limiteExpedientes: integer('limite_expedientes'),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('subscriptions_org_idx').on(t.orgId),
    uniqueIndex('subscriptions_proveedor_key').on(t.proveedor, t.proveedorSuscripcionId),
  ],
);

/** Consumo medido por periodo, base de la facturacion y de los limites de plan. */
export const usage = pgTable(
  'usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    /** Primer dia del periodo medido. */
    periodo: date('periodo').notNull(),
    metrica: text('metrica').notNull(),
    cantidad: bigint('cantidad', { mode: 'number' }).notNull().default(0),
    creadoEn: timestamp('creado_en', { withTimezone: true }).notNull().defaultNow(),
    actualizadoEn: timestamp('actualizado_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('usage_org_periodo_metrica_key').on(t.orgId, t.periodo, t.metrica)],
);

/**
 * Bitacora de auditoria. Es de solo escritura: se inserta y se lee, nunca se
 * actualiza ni se borra. Por eso no lleva actualizado_en ni borrado_en, y por
 * eso src/rls.sql no define politica de update ni de delete sobre ella: sin
 * politica, con RLS activo, PostgreSQL niega la operacion.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** restrict, no cascade: dar de baja una organizacion no borra su rastro. */
    orgId: uuid('org_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    accion: text('accion').notNull(),
    entidad: text('entidad').notNull(),
    entidadId: uuid('entidad_id'),
    datosAntes: jsonb('datos_antes'),
    datosDespues: jsonb('datos_despues'),
    ip: text('ip'),
    agenteUsuario: text('agente_usuario'),
    ocurridoEn: timestamp('ocurrido_en', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('audit_log_org_fecha_idx').on(t.orgId, t.ocurridoEn),
    index('audit_log_entidad_idx').on(t.entidad, t.entidadId),
  ],
);

/* -------------------------------------------------------------------------- */
/* Relaciones                                                                 */
/* -------------------------------------------------------------------------- */

export const organizationsRelations = relations(organizations, ({ many }) => ({
  membresias: many(memberships),
  clientes: many(clients),
  expedientes: many(cases),
  documentos: many(documents),
  prospectos: many(leads),
  suscripciones: many(subscriptions),
  consumo: many(usage),
  bitacora: many(auditLog),
}));

export const usersRelations = relations(users, ({ many }) => ({
  membresias: many(memberships),
  notificaciones: many(notifications),
  expedientesResponsable: many(cases),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  organizacion: one(organizations, { fields: [memberships.orgId], references: [organizations.id] }),
  usuario: one(users, { fields: [memberships.userId], references: [users.id] }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  organizacion: one(organizations, { fields: [clients.orgId], references: [organizations.id] }),
  expedientes: many(cases),
  documentos: many(documents),
}));

export const casesRelations = relations(cases, ({ one, many }) => ({
  organizacion: one(organizations, { fields: [cases.orgId], references: [organizations.id] }),
  cliente: one(clients, { fields: [cases.clienteId], references: [clients.id] }),
  autoridad: one(authorities, { fields: [cases.autoridadId], references: [authorities.id] }),
  procedimiento: one(procedures, { fields: [cases.procedimientoId], references: [procedures.id] }),
  responsable: one(users, { fields: [cases.responsableId], references: [users.id] }),
  actuaciones: many(caseEvents),
  plazos: many(deadlines),
  documentos: many(documents),
}));

export const caseEventsRelations = relations(caseEvents, ({ one }) => ({
  organizacion: one(organizations, { fields: [caseEvents.orgId], references: [organizations.id] }),
  expediente: one(cases, { fields: [caseEvents.casoId], references: [cases.id] }),
  registro: one(users, { fields: [caseEvents.registradoPor], references: [users.id] }),
}));

export const deadlinesRelations = relations(deadlines, ({ one, many }) => ({
  organizacion: one(organizations, { fields: [deadlines.orgId], references: [organizations.id] }),
  expediente: one(cases, { fields: [deadlines.casoId], references: [cases.id] }),
  regla: one(legalRules, { fields: [deadlines.reglaId], references: [legalRules.id] }),
  calendario: one(holidayCalendars, { fields: [deadlines.calendarioId], references: [holidayCalendars.id] }),
  avisos: many(notifications),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organizacion: one(organizations, { fields: [notifications.orgId], references: [organizations.id] }),
  usuario: one(users, { fields: [notifications.userId], references: [users.id] }),
  expediente: one(cases, { fields: [notifications.casoId], references: [cases.id] }),
  plazo: one(deadlines, { fields: [notifications.plazoId], references: [deadlines.id] }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  organizacion: one(organizations, { fields: [documents.orgId], references: [organizations.id] }),
  expediente: one(cases, { fields: [documents.casoId], references: [cases.id] }),
  cliente: one(clients, { fields: [documents.clienteId], references: [clients.id] }),
}));

export const proceduresRelations = relations(procedures, ({ one, many }) => ({
  fuente: one(legalSources, { fields: [procedures.fuenteId], references: [legalSources.id] }),
  reglas: many(legalRules),
}));

export const legalRulesRelations = relations(legalRules, ({ one }) => ({
  procedimiento: one(procedures, { fields: [legalRules.procedimientoId], references: [procedures.id] }),
  fuente: one(legalSources, { fields: [legalRules.fuenteId], references: [legalSources.id] }),
}));

export const holidayCalendarsRelations = relations(holidayCalendars, ({ one, many }) => ({
  fuente: one(legalSources, { fields: [holidayCalendars.fuenteId], references: [legalSources.id] }),
  dias: many(holidays),
}));

export const holidaysRelations = relations(holidays, ({ one }) => ({
  calendario: one(holidayCalendars, { fields: [holidays.calendarioId], references: [holidayCalendars.id] }),
}));

export const jurisprudenceRelations = relations(jurisprudence, ({ one }) => ({
  fuente: one(legalSources, { fields: [jurisprudence.fuenteId], references: [legalSources.id] }),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  organizacion: one(organizations, { fields: [leads.orgId], references: [organizations.id] }),
  cliente: one(clients, { fields: [leads.convertidoClienteId], references: [clients.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organizacion: one(organizations, { fields: [subscriptions.orgId], references: [organizations.id] }),
}));

export const usageRelations = relations(usage, ({ one }) => ({
  organizacion: one(organizations, { fields: [usage.orgId], references: [organizations.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  organizacion: one(organizations, { fields: [auditLog.orgId], references: [organizations.id] }),
  usuario: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

/* -------------------------------------------------------------------------- */
/* Clasificacion de tablas, contrato con RLS y con las pruebas                */
/* -------------------------------------------------------------------------- */

/**
 * Tablas con datos de cliente. Toda tabla de esta lista debe declarar org_id
 * con llave foranea a organizations y aparecer en src/rls.sql. Las pruebas
 * fallan si una tabla nueva no queda clasificada aqui o en TABLAS_CATALOGO.
 */
export const TABLAS_MULTIINQUILINO = [
  'memberships',
  'clients',
  'cases',
  'case_events',
  'deadlines',
  'notifications',
  'documents',
  'leads',
  'subscriptions',
  'usage',
  'audit_log',
] as const;

/** Tablas de conocimiento juridico compartido y de identidad. Sin org_id. */
export const TABLAS_CATALOGO = [
  'organizations',
  'users',
  'authorities',
  'procedures',
  'legal_rules',
  'holiday_calendars',
  'holidays',
  'legal_sources',
  'jurisprudence',
] as const;

/** Tablas de solo escritura: se insertan y se leen, nunca se actualizan. */
export const TABLAS_SOLO_ESCRITURA = ['audit_log'] as const;

/** Dimension del vector de embeddings del acervo de criterios. */
export const DIMENSION_EMBEDDING = 1536;
