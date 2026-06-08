create table if not exists servicos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  empresa_id  uuid references empresas(id) on delete set null,
  nome        text not null,
  descricao   text not null default '',
  categoria   text not null default '',
  valor_tipo  text not null default 'fixo' check (valor_tipo in ('fixo', 'por_hora', 'sob_consulta', 'range')),
  valor       numeric(12,2),
  valor_max   numeric(12,2),
  ativo       boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists servico_etapas (
  id          uuid primary key default gen_random_uuid(),
  servico_id  uuid references servicos(id) on delete cascade not null,
  titulo      text not null,
  descricao   text not null default '',
  responsavel text not null default '',
  duracao     text not null default '',
  ordem       integer not null default 0
);

alter table servicos       enable row level security;
alter table servico_etapas enable row level security;

drop policy if exists "owner" on servicos;
create policy "owner" on servicos
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "owner" on servico_etapas;
create policy "owner" on servico_etapas
  using  (exists (select 1 from servicos s where s.id = servico_id and s.user_id = auth.uid()))
  with check (exists (select 1 from servicos s where s.id = servico_id and s.user_id = auth.uid()));
