CREATE TYPE "public"."confianza_computo" AS ENUM('verificada', 'parcial', 'insuficiente', 'bloqueada_por_fuente');--> statement-breakpoint
CREATE TYPE "public"."estado_expediente" AS ENUM('nuevo', 'en_analisis', 'plazo_corriendo', 'demanda_presentada', 'contestacion', 'alegatos', 'sentencia', 'cumplimiento', 'concluido');--> statement-breakpoint
CREATE TYPE "public"."nivel_fuente" AS ENUM('A', 'B');--> statement-breakpoint
CREATE TYPE "public"."rol_membresia" AS ENUM('superadmin', 'owner', 'admin', 'abogado', 'asistente', 'cliente');--> statement-breakpoint
CREATE TYPE "public"."tipo_criterio" AS ENUM('jurisprudencia', 'tesis_aislada', 'precedente', 'sentencia', 'criterio_administrativo', 'legislacion');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"accion" text NOT NULL,
	"entidad" text NOT NULL,
	"entidad_id" uuid,
	"datos_antes" jsonb,
	"datos_despues" jsonb,
	"ip" text,
	"agente_usuario" text,
	"ocurrido_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"nombre" text NOT NULL,
	"ambito" text,
	"entidad_federativa" text,
	"dependencia" text,
	"domicilio" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"ocurrido_en" timestamp with time zone NOT NULL,
	"registrado_por" uuid,
	"metadatos" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"numero_expediente" text,
	"caratula" text NOT NULL,
	"estado" "estado_expediente" DEFAULT 'nuevo' NOT NULL,
	"materia" text,
	"autoridad_id" uuid,
	"procedimiento_id" uuid,
	"sala" text,
	"cuantia" numeric(18, 2),
	"moneda" text DEFAULT 'MXN' NOT NULL,
	"responsable_id" uuid,
	"abierto_en" date,
	"cerrado_en" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"borrado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"tipo_persona" text,
	"rfc" text,
	"correo" text,
	"telefono" text,
	"domicilio" jsonb,
	"representante_legal" text,
	"notas" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"borrado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deadlines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"caso_id" uuid NOT NULL,
	"regla_clave" text NOT NULL,
	"regla_id" uuid,
	"calendario_id" uuid,
	"calendario_clave" text NOT NULL,
	"calendarios_usados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"descripcion" text,
	"forma_notificacion" text,
	"fecha_notificacion" date NOT NULL,
	"surte_efectos" date,
	"inicio_computo" date,
	"vence" date,
	"traza" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fuentes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"faltantes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"advertencias" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"inhabiles_aplicados" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confianza" "confianza_computo" NOT NULL,
	"motor_version" text,
	"calculado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"cumplido_en" timestamp with time zone,
	"creado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"caso_id" uuid,
	"cliente_id" uuid,
	"nombre" text NOT NULL,
	"tipo" text,
	"mime" text,
	"tamano_bytes" bigint,
	"sha256" text NOT NULL,
	"ruta_almacenamiento" text NOT NULL,
	"paginas" integer,
	"texto_extraido" text,
	"subido_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"borrado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "holiday_calendars" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"nombre" text NOT NULL,
	"ambito" text,
	"anio" integer NOT NULL,
	"nivel" "nivel_fuente" NOT NULL,
	"fuente_id" uuid,
	"publicado_en" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "holidays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calendario_id" uuid NOT NULL,
	"fecha" date NOT NULL,
	"motivo" text,
	"fundamento" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jurisprudence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tipo_criterio" "tipo_criterio" NOT NULL,
	"rubro" text NOT NULL,
	"texto" text NOT NULL,
	"organo" text,
	"epoca" text,
	"registro_digital" text,
	"materia" text,
	"precedentes" text,
	"clave_control" text,
	"instancia" text,
	"fecha_publicacion" date,
	"fuente_id" uuid,
	"nivel" "nivel_fuente" NOT NULL,
	"verificado" boolean DEFAULT false NOT NULL,
	"verificado_en" timestamp with time zone,
	"verificado_por" uuid,
	"embedding" vector(1536),
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"nombre" text NOT NULL,
	"correo" text,
	"telefono" text,
	"origen" text,
	"mensaje" text,
	"estado" text DEFAULT 'nuevo' NOT NULL,
	"convertido_cliente_id" uuid,
	"atendido_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"procedimiento_id" uuid,
	"descripcion" text NOT NULL,
	"cantidad" integer NOT NULL,
	"unidad" text NOT NULL,
	"primer_dia" text NOT NULL,
	"prorroga_si_vence_inhabil" boolean NOT NULL,
	"incluye_dia_vencimiento" boolean NOT NULL,
	"calendarios" jsonb NOT NULL,
	"surtimiento" jsonb NOT NULL,
	"fundamento" jsonb NOT NULL,
	"fuente_id" uuid,
	"nivel" "nivel_fuente" NOT NULL,
	"vigente_desde" date,
	"vigente_hasta" date,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "legal_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"titulo" text NOT NULL,
	"ordenamiento" text,
	"nivel" "nivel_fuente" NOT NULL,
	"publicacion_dof" text,
	"fecha_publicacion" date,
	"vigente_desde" date,
	"vigente_hasta" date,
	"url" text,
	"ruta_archivo" text,
	"sha256" text,
	"verificado_en" timestamp with time zone,
	"verificado_por" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rol" "rol_membresia" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"invitado_en" timestamp with time zone,
	"aceptado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"caso_id" uuid,
	"plazo_id" uuid,
	"canal" text NOT NULL,
	"asunto" text NOT NULL,
	"cuerpo" text,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"programada_para" timestamp with time zone,
	"enviada_en" timestamp with time zone,
	"leida_en" timestamp with time zone,
	"error" text,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nombre" text NOT NULL,
	"razon_social" text,
	"rfc" text,
	"correo_contacto" text,
	"telefono" text,
	"zona_horaria" text DEFAULT 'America/Mexico_City' NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"borrado_en" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "procedures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"materia" text,
	"ordenamiento" text,
	"fuente_id" uuid,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"plan" text NOT NULL,
	"estado" text NOT NULL,
	"proveedor" text,
	"proveedor_suscripcion_id" text,
	"periodo_inicio" timestamp with time zone,
	"periodo_fin" timestamp with time zone,
	"cancelada_en" timestamp with time zone,
	"limite_usuarios" integer,
	"limite_expedientes" integer,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"periodo" date NOT NULL,
	"metrica" text NOT NULL,
	"cantidad" bigint DEFAULT 0 NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correo" text NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text,
	"hash_contrasena" text,
	"cedula_profesional" text,
	"verificado_en" timestamp with time zone,
	"ultimo_acceso_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"borrado_en" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_caso_id_cases_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_registrado_por_users_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_cliente_id_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_autoridad_id_authorities_id_fk" FOREIGN KEY ("autoridad_id") REFERENCES "public"."authorities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_procedimiento_id_procedures_id_fk" FOREIGN KEY ("procedimiento_id") REFERENCES "public"."procedures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_responsable_id_users_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_caso_id_cases_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_regla_id_legal_rules_id_fk" FOREIGN KEY ("regla_id") REFERENCES "public"."legal_rules"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_calendario_id_holiday_calendars_id_fk" FOREIGN KEY ("calendario_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deadlines" ADD CONSTRAINT "deadlines_creado_por_users_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_caso_id_cases_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_cliente_id_clients_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_subido_por_users_id_fk" FOREIGN KEY ("subido_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holiday_calendars" ADD CONSTRAINT "holiday_calendars_fuente_id_legal_sources_id_fk" FOREIGN KEY ("fuente_id") REFERENCES "public"."legal_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "holidays" ADD CONSTRAINT "holidays_calendario_id_holiday_calendars_id_fk" FOREIGN KEY ("calendario_id") REFERENCES "public"."holiday_calendars"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisprudence" ADD CONSTRAINT "jurisprudence_fuente_id_legal_sources_id_fk" FOREIGN KEY ("fuente_id") REFERENCES "public"."legal_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jurisprudence" ADD CONSTRAINT "jurisprudence_verificado_por_users_id_fk" FOREIGN KEY ("verificado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_convertido_cliente_id_clients_id_fk" FOREIGN KEY ("convertido_cliente_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_atendido_por_users_id_fk" FOREIGN KEY ("atendido_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_rules" ADD CONSTRAINT "legal_rules_procedimiento_id_procedures_id_fk" FOREIGN KEY ("procedimiento_id") REFERENCES "public"."procedures"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_rules" ADD CONSTRAINT "legal_rules_fuente_id_legal_sources_id_fk" FOREIGN KEY ("fuente_id") REFERENCES "public"."legal_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_sources" ADD CONSTRAINT "legal_sources_verificado_por_users_id_fk" FOREIGN KEY ("verificado_por") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_caso_id_cases_id_fk" FOREIGN KEY ("caso_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_plazo_id_deadlines_id_fk" FOREIGN KEY ("plazo_id") REFERENCES "public"."deadlines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "procedures" ADD CONSTRAINT "procedures_fuente_id_legal_sources_id_fk" FOREIGN KEY ("fuente_id") REFERENCES "public"."legal_sources"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage" ADD CONSTRAINT "usage_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_org_fecha_idx" ON "audit_log" USING btree ("org_id","ocurrido_en");--> statement-breakpoint
CREATE INDEX "audit_log_entidad_idx" ON "audit_log" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE UNIQUE INDEX "authorities_clave_key" ON "authorities" USING btree ("clave");--> statement-breakpoint
CREATE INDEX "case_events_org_idx" ON "case_events" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "case_events_caso_fecha_idx" ON "case_events" USING btree ("caso_id","ocurrido_en");--> statement-breakpoint
CREATE INDEX "cases_org_idx" ON "cases" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "cases_cliente_idx" ON "cases" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cases_org_numero_key" ON "cases" USING btree ("org_id","numero_expediente");--> statement-breakpoint
CREATE INDEX "clients_org_idx" ON "clients" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_org_rfc_key" ON "clients" USING btree ("org_id","rfc");--> statement-breakpoint
CREATE INDEX "deadlines_org_idx" ON "deadlines" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "deadlines_caso_idx" ON "deadlines" USING btree ("caso_id");--> statement-breakpoint
CREATE INDEX "deadlines_vence_idx" ON "deadlines" USING btree ("vence");--> statement-breakpoint
CREATE INDEX "documents_org_idx" ON "documents" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "documents_caso_idx" ON "documents" USING btree ("caso_id");--> statement-breakpoint
CREATE UNIQUE INDEX "documents_org_sha256_key" ON "documents" USING btree ("org_id","sha256");--> statement-breakpoint
CREATE UNIQUE INDEX "holiday_calendars_clave_key" ON "holiday_calendars" USING btree ("clave");--> statement-breakpoint
CREATE INDEX "holiday_calendars_anio_idx" ON "holiday_calendars" USING btree ("anio");--> statement-breakpoint
CREATE UNIQUE INDEX "holidays_calendario_fecha_key" ON "holidays" USING btree ("calendario_id","fecha");--> statement-breakpoint
CREATE UNIQUE INDEX "jurisprudence_registro_digital_key" ON "jurisprudence" USING btree ("registro_digital");--> statement-breakpoint
CREATE INDEX "jurisprudence_tipo_idx" ON "jurisprudence" USING btree ("tipo_criterio");--> statement-breakpoint
CREATE INDEX "jurisprudence_embedding_idx" ON "jurisprudence" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "leads_org_estado_idx" ON "leads" USING btree ("org_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_rules_clave_key" ON "legal_rules" USING btree ("clave");--> statement-breakpoint
CREATE INDEX "legal_rules_procedimiento_idx" ON "legal_rules" USING btree ("procedimiento_id");--> statement-breakpoint
CREATE UNIQUE INDEX "legal_sources_clave_key" ON "legal_sources" USING btree ("clave");--> statement-breakpoint
CREATE INDEX "legal_sources_nivel_idx" ON "legal_sources" USING btree ("nivel");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_org_user_key" ON "memberships" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_org_idx" ON "notifications" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "notifications_user_estado_idx" ON "notifications" USING btree ("user_id","estado");--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "procedures_clave_key" ON "procedures" USING btree ("clave");--> statement-breakpoint
CREATE INDEX "subscriptions_org_idx" ON "subscriptions" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_proveedor_key" ON "subscriptions" USING btree ("proveedor","proveedor_suscripcion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_org_periodo_metrica_key" ON "usage" USING btree ("org_id","periodo","metrica");--> statement-breakpoint
CREATE UNIQUE INDEX "users_correo_key" ON "users" USING btree ("correo");