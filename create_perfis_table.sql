-- ============================================================
-- Wady Platform — Tabela `perfis` (v2)
-- Execute no SQL Editor: https://app.supabase.com → SQL Editor
-- ============================================================

-- 1. Extensão para geração de UUIDs (já ativa na maioria dos projetos)
create extension if not exists "pgcrypto";

-- 2. Criação da tabela
create table if not exists public.perfis (
  id            uuid primary key default gen_random_uuid(),

  -- Vínculo 1:1 com o usuário autenticado
  user_id       uuid not null references auth.users (id) on delete cascade,

  -- Dados obrigatórios
  nome          text not null,
  tipo_usuario  text not null check (tipo_usuario in ('Cliente', 'Profissional')),

  -- Dados opcionais (preenchidos apenas por Profissionais)
  bio           text,
  categoria     text,
  foto_url      text,

  -- Auditoria
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  -- Garante apenas um perfil por usuário
  constraint perfis_user_id_unique unique (user_id)
);

-- 3. Índices para consultas frequentes
create index if not exists perfis_user_id_idx      on public.perfis (user_id);
create index if not exists perfis_tipo_usuario_idx on public.perfis (tipo_usuario);
create index if not exists perfis_categoria_idx    on public.perfis (categoria)
  where categoria is not null;

-- 4. Função e trigger para atualizar `atualizado_em` automaticamente
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists set_perfis_updated_at on public.perfis;
create trigger set_perfis_updated_at
  before update on public.perfis
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.perfis enable row level security;

-- Usuário vê apenas o próprio perfil
create policy "Usuário vê o próprio perfil"
  on public.perfis for select
  using (auth.uid() = user_id);

-- Usuário cria apenas o próprio perfil
create policy "Usuário cria o próprio perfil"
  on public.perfis for insert
  with check (auth.uid() = user_id);

-- Usuário atualiza apenas o próprio perfil
create policy "Usuário atualiza o próprio perfil"
  on public.perfis for update
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Usuário deleta apenas o próprio perfil
create policy "Usuário deleta o próprio perfil"
  on public.perfis for delete
  using (auth.uid() = user_id);

-- ============================================================
-- (Opcional) Política pública: qualquer visitante pode VER
-- perfis de Profissionais (útil para listagem pública).
-- Descomente as linhas abaixo se desejar habilitar:
-- ============================================================

-- create policy "Perfis de Profissionais são públicos"
--   on public.perfis for select
--   using (tipo_usuario = 'Profissional');

-- ============================================================
-- Verificação final
-- ============================================================
-- select * from public.perfis limit 5;
