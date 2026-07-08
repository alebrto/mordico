-- =========================================================
-- MORDISCO – CONTROL DE VENTAS
-- Esquema de base de datos para Supabase (PostgreSQL)
-- =========================================================
-- Ejecutar en el SQL Editor de tu proyecto Supabase.
-- Requiere la extensión pgcrypto para gen_random_uuid().
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
create table if not exists public.ventas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cliente_id uuid references public.clientes(id) on delete set null,
  fecha date not null default current_date,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric not null default 2600,
  total numeric generated always as (cantidad * precio_unitario) stored,
  abonado numeric not null default 0,
  saldo numeric generated always as (cantidad * precio_unitario - abonado) stored,
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
-- FUNCIÓN + TRIGGER: al insertar un abono, actualizar la venta
-- (abonado, saldo generado automáticamente, estado)
-- =========================================================
create or replace function public.actualizar_venta_tras_abono()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.ventas
  set abonado = abonado + new.valor,
      estado = case
        when (abonado + new.valor) >= total then 'Pagado'
        when (abonado + new.valor) > 0 then 'Abono parcial'
        else 'Debe todo'
      end
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
