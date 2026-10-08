-- ============================================================
-- Copa dos Amigos - Schema completo (PostgreSQL / Supabase)
-- Execute no SQL Editor do Supabase. Arquivo idempotente.
-- Ordem: tabelas > índices > funções > RLS > realtime > storage
-- Observação: usa sha256() nativo do PostgreSQL (sem extensões).
-- ============================================================

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------

-- Lista de administradores (normalmente apenas 1 linha real).
create table if not exists administradores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  nome text,
  criado_em timestamptz not null default now()
);

-- Ligas e competições (cache da football-data.org + manuais).
create table if not exists ligas (
  id uuid primary key default gen_random_uuid(),
  api_id integer unique,
  nome text not null,
  pais text,
  emblema_url text,
  tipo text not null default 'liga' check (tipo in ('liga', 'selecao', 'copa', 'outra')),
  fonte text not null default 'api' check (fonte in ('api', 'manual')),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Times (API ou cadastrados manualmente: Bomba Patch, clássicos etc).
create table if not exists times (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  sigla text,
  liga_id uuid references ligas(id) on delete set null,
  liga_nome text,
  escudo_url text,
  tipo text not null default 'clube' check (tipo in ('clube', 'selecao', 'classico', 'custom')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Perfis dos jogadores (criados apenas pelo administrador).
create table if not exists perfis (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  avatar_url text,
  capa_url text,
  biografia text,
  time_coracao_id uuid references times(id) on delete set null,
  senha_hash text,
  possui_senha boolean not null default false,
  criado_por uuid references auth.users(id) on delete set null,
  criado_em timestamptz not null default now()
);

-- Campeonatos.
create table if not exists torneios (
  id uuid primary key default gen_random_uuid(),
  organizador_id uuid references auth.users(id) on delete set null,
  nome text not null,
  mes text not null,
  ano integer not null,
  plataforma text not null,
  jogo text not null,
  formato text not null default 'grupos_mata_mata',
  status text not null default 'configuracao'
    check (status in ('configuracao', 'inscricoes', 'sorteio', 'grupos', 'mata_mata', 'finalizado', 'cancelado')),
  config jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Ligas habilitadas para cada torneio.
create table if not exists torneio_ligas (
  torneio_id uuid not null references torneios(id) on delete cascade,
  liga_id uuid not null references ligas(id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (torneio_id, liga_id)
);

-- Times habilitados/disponíveis para o sorteio de cada torneio.
create table if not exists torneio_times (
  torneio_id uuid not null references torneios(id) on delete cascade,
  time_id uuid not null references times(id) on delete cascade,
  disponivel boolean not null default true,
  selecionado boolean not null default false,
  criado_em timestamptz not null default now(),
  primary key (torneio_id, time_id)
);

-- Jogadores inscritos no torneio (resultado do sorteio).
create table if not exists participantes (
  id uuid primary key default gen_random_uuid(),
  torneio_id uuid not null references torneios(id) on delete cascade,
  perfil_id uuid references perfis(id) on delete cascade,
  apelido text,
  grupo text,
  time_id uuid references times(id) on delete set null,
  ordem_sorteio integer,
  criado_em timestamptz not null default now(),
  unique (torneio_id, perfil_id)
);

-- Partidas da fase de grupos e do mata-mata.
create table if not exists partidas (
  id uuid primary key default gen_random_uuid(),
  torneio_id uuid not null references torneios(id) on delete cascade,
  fase text not null default 'grupos'
    check (fase in ('grupos', 'oitavas', 'quartas', 'semi', 'terceiro', 'final')),
  grupo text,
  rodada integer,
  casa_id uuid references participantes(id) on delete set null,
  fora_id uuid references participantes(id) on delete set null,
  gols_casa integer,
  gols_fora integer,
  penaltis_casa integer,
  penaltis_fora integer,
  finalizada boolean not null default false,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
create index if not exists idx_times_liga on times(liga_id);
create index if not exists idx_times_nome on times(nome);
create index if not exists idx_perfis_nome on perfis(nome);
create index if not exists idx_participantes_torneio on participantes(torneio_id);
create index if not exists idx_participantes_perfil on participantes(perfil_id);
create index if not exists idx_partidas_torneio on partidas(torneio_id);
create index if not exists idx_partidas_fase on partidas(torneio_id, fase);
create index if not exists idx_torneio_times_torneio on torneio_times(torneio_id);
create index if not exists idx_torneio_ligas_torneio on torneio_ligas(torneio_id);

-- ------------------------------------------------------------
-- Funções auxiliares
-- ------------------------------------------------------------

-- Mantém o atualizado_em do torneio sempre fresco.
create or replace function public.marca_atualizado()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_torneios_atualizado on torneios;
create trigger trg_torneios_atualizado
  before update on torneios
  for each row execute function public.marca_atualizado();

-- Retorna true se o usuário autenticado é administrador.
create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from administradores where usuario_id = auth.uid()
  );
$$;

revoke all on function public.eh_admin() from public;
grant execute on function public.eh_admin() to anon, authenticated;

-- Valida o PIN de um perfil sem expor o hash.
create or replace function public.verificar_pin(p_perfil_id uuid, p_pin text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from perfis
    where id = p_perfil_id
      and possui_senha is true
      and senha_hash = encode(sha256(convert_to(p_pin, 'UTF8')), 'hex')
  );
$$;

revoke all on function public.verificar_pin(uuid, text) from public;
grant execute on function public.verificar_pin(uuid, text) to anon, authenticated;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table administradores enable row level security;
alter table ligas          enable row level security;
alter table times          enable row level security;
alter table perfis         enable row level security;
alter table torneios       enable row level security;
alter table torneio_ligas  enable row level security;
alter table torneio_times  enable row level security;
alter table participantes  enable row level security;
alter table partidas       enable row level security;

-- Leitura pública (anon e authenticated) em todas as tabelas de conteúdo.
do $$
declare t text;
begin
  foreach t in array array['ligas','times','perfis','torneios','torneio_ligas','torneio_times','participantes','partidas']
  loop
    execute format('drop policy if exists "leitura_publica_%s" on %I', t, t);
    execute format(
      'create policy "leitura_publica_%s" on %I for select to anon, authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- Escrita administrativa (insert/update/delete) em todas as tabelas de conteúdo.
do $$
declare t text;
begin
  foreach t in array array['ligas','times','perfis','torneios','torneio_ligas','torneio_times','participantes','partidas']
  loop
    execute format('drop policy if exists "admin_insert_%s" on %I', t, t);
    execute format('create policy "admin_insert_%s" on %I for insert to authenticated with check (eh_admin())', t, t);

    execute format('drop policy if exists "admin_update_%s" on %I', t, t);
    execute format('create policy "admin_update_%s" on %I for update to authenticated using (eh_admin()) with check (eh_admin())', t, t);

    execute format('drop policy if exists "admin_delete_%s" on %I', t, t);
    execute format('create policy "admin_delete_%s" on %I for delete to authenticated using (eh_admin())', t, t);
  end loop;
end $$;

-- Nota: a edição do próprio perfil feita pelo jogador (com PIN válido)
-- NÃO tem política de update aqui. Ela acontece via Supabase Edge Function
-- (editar-perfil) com a service_role, que valida o PIN e só permite alterar
-- avatar_url, capa_url, biografia, time_coracao_id e senha_hash.

-- administradores: leitura e escrita apenas para administradores.
drop policy if exists "admin_le_administradores" on administradores;
create policy "admin_le_administradores" on administradores
  for select to authenticated using (eh_admin());

drop policy if exists "admin_manage_administradores" on administradores;
create policy "admin_manage_administradores" on administradores
  for all to authenticated using (eh_admin()) with check (eh_admin());

-- ------------------------------------------------------------
-- Realtime (tempo real nas telas de sorteio, tabela e partidas)
-- ------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table torneios;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table participantes;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table partidas;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table perfis;
exception when duplicate_object or undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table torneio_times;
exception when duplicate_object or undefined_object then null;
end $$;

-- ------------------------------------------------------------
-- Storage: buckets de avatar e capa
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('capas', 'capas', true)
on conflict (id) do nothing;

-- Leitura pública das imagens.
drop policy if exists "storage_leitura_publica" on storage.objects;
create policy "storage_leitura_publica" on storage.objects
  for select to public
  using (bucket_id in ('avatars', 'capas'));

-- Upload/edição apenas pelo administrador autenticado.
-- (Uploads do jogador com PIN válido são feitos pela Edge Function editar-perfil.)
drop policy if exists "storage_admin_insert" on storage.objects;
create policy "storage_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('avatars', 'capas') and eh_admin());

drop policy if exists "storage_admin_update" on storage.objects;
create policy "storage_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id in ('avatars', 'capas') and eh_admin())
  with check (bucket_id in ('avatars', 'capas') and eh_admin());

drop policy if exists "storage_admin_delete" on storage.objects;
create policy "storage_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id in ('avatars', 'capas') and eh_admin());
