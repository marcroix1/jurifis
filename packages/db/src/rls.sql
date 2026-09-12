-- =============================================================================
-- JURIFIS: aislamiento por organizacion con Row Level Security
-- =============================================================================
--
-- Tercer y ultimo paso del despliegue. El orden importa y no es negociable:
--   1. src/extensiones.sql   pgcrypto y vector, antes de crear las tablas
--   2. drizzle-kit migrate   estructura
--   3. src/rls.sql           este archivo: rol de aplicacion y politicas
-- Se aplica con el rol dueno de las tablas, nunca con jurifis_app.
--
-- Modelo de acceso
-- ----------------
-- La aplicacion abre la conexion como jurifis_app y, en cada transaccion que
-- toca datos de cliente, ejecuta set_config('app.org_id', <uuid>, true). Las
-- politicas de abajo comparan org_id contra ese ajuste. Si el ajuste no esta
-- puesto, current_setting('app.org_id', true) devuelve nulo, la comparacion
-- da nulo y la fila no pasa el filtro: sin org fijada no se ve nada. El corte
-- es cerrado por omision, no abierto.
--
-- Por que el superadmin no puede leer expedientes
-- -----------------------------------------------
-- superadmin es un rol de plataforma, no un rol de despacho: existe para
-- administrar cuentas, planes, limites y soporte. El contenido de un
-- expediente esta cubierto por el secreto profesional que el abogado debe a
-- su cliente, y ese deber no tiene una excepcion por conveniencia operativa
-- del proveedor del software. Por eso el aislamiento no se decide en el
-- codigo de la aplicacion, donde un olvido en un where lo derrumba, sino en
-- el motor: aqui no existe ninguna politica que exente a un rol de la
-- comparacion con app.org_id, ni siquiera al superadmin. Ademas jurifis_app
-- se crea con NOBYPASSRLS y no es dueno de las tablas, porque el dueno de una
-- tabla se salta RLS de forma natural. Consecuencia practica: para ver un
-- expediente hay que fijar la org de ese expediente, y para eso hace falta
-- una membresia vigente en ella. El acceso de soporte a datos de cliente se
-- concede caso por caso, con autorizacion del despacho, y queda en audit_log.
--
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. Extensiones
-- -----------------------------------------------------------------------------
-- Ya quedaron creadas en src/extensiones.sql, que corre antes de la migracion
-- porque jurisprudence.embedding no se puede crear sin la extension vector.
-- Se repiten aqui por si el despliegue arranco a la mitad. Son idempotentes.
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- -----------------------------------------------------------------------------
-- 1. Rol de aplicacion
-- -----------------------------------------------------------------------------
-- Sin superusuario y sin bypass de RLS. No es dueno de ninguna tabla: la
-- migracion corre con el rol dueno (por ejemplo jurifis_owner) y este rol solo
-- recibe permisos de datos.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'jurifis_app') then
    create role jurifis_app login nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
  else
    alter role jurifis_app nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end
$$;

grant usage on schema public to jurifis_app;
grant select, insert, update, delete on all tables in schema public to jurifis_app;
grant usage, select on all sequences in schema public to jurifis_app;
alter default privileges in schema public
  grant select, insert, update, delete on tables to jurifis_app;

-- La bitacora es de solo escritura tambien a nivel de permiso, no solo de
-- politica. Doble candado: sin permiso y sin politica.
revoke update, delete, truncate on table audit_log from jurifis_app;

-- -----------------------------------------------------------------------------
-- 2. Aislamiento por organizacion
-- -----------------------------------------------------------------------------
-- force row level security hace que la politica aplique tambien al dueno de la
-- tabla, de modo que un descuido de despliegue no abra el aislamiento.

-- memberships
alter table memberships enable row level security;
alter table memberships force row level security;
drop policy if exists aislamiento_org on memberships;
create policy aislamiento_org on memberships
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- clients
alter table clients enable row level security;
alter table clients force row level security;
drop policy if exists aislamiento_org on clients;
create policy aislamiento_org on clients
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- cases
alter table cases enable row level security;
alter table cases force row level security;
drop policy if exists aislamiento_org on cases;
create policy aislamiento_org on cases
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- case_events
alter table case_events enable row level security;
alter table case_events force row level security;
drop policy if exists aislamiento_org on case_events;
create policy aislamiento_org on case_events
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- deadlines
alter table deadlines enable row level security;
alter table deadlines force row level security;
drop policy if exists aislamiento_org on deadlines;
create policy aislamiento_org on deadlines
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- notifications
alter table notifications enable row level security;
alter table notifications force row level security;
drop policy if exists aislamiento_org on notifications;
create policy aislamiento_org on notifications
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- documents
alter table documents enable row level security;
alter table documents force row level security;
drop policy if exists aislamiento_org on documents;
create policy aislamiento_org on documents
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- leads
alter table leads enable row level security;
alter table leads force row level security;
drop policy if exists aislamiento_org on leads;
create policy aislamiento_org on leads
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- subscriptions
alter table subscriptions enable row level security;
alter table subscriptions force row level security;
drop policy if exists aislamiento_org on subscriptions;
create policy aislamiento_org on subscriptions
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- usage
alter table usage enable row level security;
alter table usage force row level security;
drop policy if exists aislamiento_org on usage;
create policy aislamiento_org on usage
  for all
  using (org_id = current_setting('app.org_id', true)::uuid)
  with check (org_id = current_setting('app.org_id', true)::uuid);

-- audit_log: solo escritura. Se inserta dentro de la org y se lee dentro de la
-- org. No hay politica for update ni for delete, y con RLS activo lo que no
-- tiene politica queda negado. Una bitacora que se puede corregir no sirve
-- como prueba de nada.
alter table audit_log enable row level security;
alter table audit_log force row level security;
drop policy if exists aislamiento_org on audit_log;
drop policy if exists aislamiento_org_insert on audit_log;
drop policy if exists aislamiento_org_select on audit_log;
create policy aislamiento_org_insert on audit_log
  for insert
  with check (org_id = current_setting('app.org_id', true)::uuid);
create policy aislamiento_org_select on audit_log
  for select
  using (org_id = current_setting('app.org_id', true)::uuid);

-- -----------------------------------------------------------------------------
-- 3. Organizations
-- -----------------------------------------------------------------------------
-- La organizacion es la raiz del aislamiento y su llave primaria hace el papel
-- de org_id. Se filtra por id para que una sesion no enumere a los demas
-- despachos. El alta de una organizacion nueva corre con el rol dueno, fuera
-- de esta politica.
alter table organizations enable row level security;
alter table organizations force row level security;
drop policy if exists aislamiento_org on organizations;
create policy aislamiento_org on organizations
  for all
  using (id = current_setting('app.org_id', true)::uuid)
  with check (id = current_setting('app.org_id', true)::uuid);

-- -----------------------------------------------------------------------------
-- 4. Catalogo juridico compartido
-- -----------------------------------------------------------------------------
-- authorities, procedures, legal_rules, holiday_calendars, holidays,
-- legal_sources y jurisprudence no llevan org_id y quedan sin RLS: son derecho
-- publicado, no datos de cliente. Se escriben solo con el rol dueno, en
-- migracion de datos verificada contra fuente de Nivel A.
revoke insert, update, delete on table authorities from jurifis_app;
revoke insert, update, delete on table procedures from jurifis_app;
revoke insert, update, delete on table legal_rules from jurifis_app;
revoke insert, update, delete on table holiday_calendars from jurifis_app;
revoke insert, update, delete on table holidays from jurifis_app;
revoke insert, update, delete on table legal_sources from jurifis_app;
revoke insert, update, delete on table jurisprudence from jurifis_app;

-- users es identidad global: la aplicacion la lee y la escribe por el flujo de
-- autenticacion, fuera del contexto de una org. No lleva RLS por org.
