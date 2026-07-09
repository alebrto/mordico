-- =========================================================
-- MORDISCO – CONTROL DE VENTAS
-- Esquema de base de datos para Supabase (PostgreSQL)
-- =========================================================
-- Ejecutar en el SQL Editor de tu proyecto Supabase.
-- Requiere la extensión pgcrypto para gen_random_uuid().
--
-- ⚠️ MIGRACIÓN (solo si tu tabla "ventas" YA EXISTE de una versión
-- anterior de este proyecto, donde "total" y "saldo" eran columnas
-- GENERATED): ejecuta estas 2 líneas UNA SOLA VEZ antes del resto de este
-- archivo. Si tu tabla es nueva o ya no son columnas generadas, ignóralas
-- (no hacen daño, Postgres solo da un aviso si no aplica):
--
--   alter table public.ventas alter column total drop expression;
--   alter table public.ventas alter column saldo drop expression;
--
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------
-- Todas las tablas incluyen user_id para poder aplicar RLS
-- por usuario (cada usuario ve únicamente sus propios datos).
-- ---------------------------------------------------------

-- CLIENTES
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  telefono text,
  created_at timestamptz not null default now()
);

-- VENTAS
-- NOTA: "total", "saldo" y "estado" NO son columnas generadas (GENERATED
-- ALWAYS AS). Postgres prohíbe insertar/actualizar un valor explícito en una
-- columna generada, y el frontend necesita poder enviar estos campos (o no
-- enviarlos) sin que la operación falle. En su lugar, se calculan siempre
-- mediante el trigger "calcular_totales_venta" (ver más abajo), que se
-- dispara ANTES de cada INSERT/UPDATE y sobreescribe estos tres campos a
-- partir de cantidad, precio_unitario y abonado. Así quedan siempre
-- correctos y sincronizados, sin importar qué envíe el frontend.
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  fecha date not null default current_date,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric not null default 2600,
  total numeric not null default 0,
  abonado numeric not null default 0,
  saldo numeric not null default 0,
  estado text not null default 'Debe todo' check (estado in ('Pagado','Abono parcial','Debe todo')),
  created_at timestamptz not null default now()
);

-- GASTOS
create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fecha date not null default current_date,
  concepto text not null,
  valor numeric not null check (valor >= 0),
  tipo text not null check (tipo in ('Fijo','Variable')),
  created_at timestamptz not null default now()
);

-- ABONOS
create table if not exists public.abonos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  venta_id uuid not null references public.ventas(id) on delete cascade,
  fecha date not null default current_date,
  valor numeric not null check (valor > 0),
  created_at timestamptz not null default now()
);

-- INVENTARIO
create table if not exists public.inventario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre text not null,
  unidad text not null default 'g',
  cantidad_actual numeric not null default 0,
  cantidad_minima numeric not null default 0,
  costo_unitario numeric not null default 0,
  created_at timestamptz not null default now()
);

-- Índices útiles
create index if not exists idx_ventas_cliente on public.ventas(cliente_id);
create index if not exists idx_ventas_fecha on public.ventas(fecha);
create index if not exists idx_abonos_venta on public.abonos(venta_id);
create index if not exists idx_gastos_fecha on public.gastos(fecha);

-- =========================================================
-- FUNCIÓN + TRIGGER: recalcular total, saldo y estado de una venta
-- ANTES de insertarla o actualizarla, sin importar qué haya enviado
-- el frontend. Esto es lo que hace que el color del estado (rojo/
-- amarillo/verde) siempre sea correcto en cualquier vista.
-- =========================================================
create or replace function public.calcular_totales_venta()
returns trigger
language plpgsql
as $$
begin
  new.total := new.cantidad * new.precio_unitario;
  new.saldo := new.total - new.abonado;
  new.estado := case
    when new.saldo <= 0 then 'Pagado'
    when new.abonado > 0 then 'Abono parcial'
    else 'Debe todo'
  end;
  return new;
end;
$$;

drop trigger if exists trg_calcular_totales_venta on public.ventas;
create trigger trg_calcular_totales_venta
before insert or update on public.ventas
for each row execute function public.calcular_totales_venta();

-- =========================================================
-- FUNCIÓN + TRIGGER: al insertar un abono, sumarlo al campo
-- "abonado" de la venta. El trigger de arriba (BEFORE UPDATE) se
-- encarga de recalcular saldo/estado automáticamente al hacer este
-- UPDATE, así que aquí solo hace falta sumar el abono.
-- =========================================================
create or replace function public.actualizar_venta_tras_abono()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.ventas
  set abonado = abonado + new.valor
  where id = new.venta_id;
  return new;
end;
$$;

drop trigger if exists trg_abono_actualiza_venta on public.abonos;
create trigger trg_abono_actualiza_venta
after insert on public.abonos
for each row execute function public.actualizar_venta_tras_abono();

-- =========================================================
-- FUNCIÓN + TRIGGER: al insertar una venta, descontar inventario
-- según la receta estándar de una empanada.
-- Ajusta los nombres de insumo para que coincidan con tu tabla `inventario`.
-- =========================================================
create or replace function public.descontar_inventario_tras_venta()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.inventario set cantidad_actual = cantidad_actual - (new.cantidad * 25)
    where user_id = new.user_id and lower(nombre) = 'harina';
  update public.inventario set cantidad_actual = cantidad_actual - (new.cantidad * 15)
    where user_id = new.user_id and lower(nombre) = 'pollo';
  update public.inventario set cantidad_actual = cantidad_actual - (new.cantidad * 15)
    where user_id = new.user_id and lower(nombre) = 'carne';
  update public.inventario set cantidad_actual = cantidad_actual - (new.cantidad * 5)
    where user_id = new.user_id and lower(nombre) = 'soya';
  update public.inventario set cantidad_actual = cantidad_actual - (new.cantidad * 5)
    where user_id = new.user_id and lower(nombre) = 'jamón';
  update public.inventario set cantidad_actual = cantidad_actual - (new.cantidad * 10)
    where user_id = new.user_id and lower(nombre) = 'aceite';
  return new;
end;
$$;

drop trigger if exists trg_venta_descuenta_inventario on public.ventas;
create trigger trg_venta_descuenta_inventario
after insert on public.ventas
for each row execute function public.descontar_inventario_tras_venta();

-- =========================================================
-- ROW LEVEL SECURITY
-- Cada usuario autenticado solo puede ver/editar sus propios registros.
-- =========================================================
alter table public.clientes enable row level security;
alter table public.ventas enable row level security;
alter table public.gastos enable row level security;
alter table public.abonos enable row level security;
alter table public.inventario enable row level security;

-- CLIENTES
create policy "clientes_select_own" on public.clientes for select using (auth.uid() = user_id);
create policy "clientes_insert_own" on public.clientes for insert with check (auth.uid() = user_id);
create policy "clientes_update_own" on public.clientes for update using (auth.uid() = user_id);
create policy "clientes_delete_own" on public.clientes for delete using (auth.uid() = user_id);

-- VENTAS
create policy "ventas_select_own" on public.ventas for select using (auth.uid() = user_id);
create policy "ventas_insert_own" on public.ventas for insert with check (auth.uid() = user_id);
create policy "ventas_update_own" on public.ventas for update using (auth.uid() = user_id);
create policy "ventas_delete_own" on public.ventas for delete using (auth.uid() = user_id);

-- GASTOS
create policy "gastos_select_own" on public.gastos for select using (auth.uid() = user_id);
create policy "gastos_insert_own" on public.gastos for insert with check (auth.uid() = user_id);
create policy "gastos_update_own" on public.gastos for update using (auth.uid() = user_id);
create policy "gastos_delete_own" on public.gastos for delete using (auth.uid() = user_id);

-- ABONOS
create policy "abonos_select_own" on public.abonos for select using (auth.uid() = user_id);
create policy "abonos_insert_own" on public.abonos for insert with check (auth.uid() = user_id);
create policy "abonos_update_own" on public.abonos for update using (auth.uid() = user_id);
create policy "abonos_delete_own" on public.abonos for delete using (auth.uid() = user_id);

-- INVENTARIO
create policy "inventario_select_own" on public.inventario for select using (auth.uid() = user_id);
create policy "inventario_insert_own" on public.inventario for insert with check (auth.uid() = user_id);
create policy "inventario_update_own" on public.inventario for update using (auth.uid() = user_id);
create policy "inventario_delete_own" on public.inventario for delete using (auth.uid() = user_id);
