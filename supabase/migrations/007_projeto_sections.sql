-- Controle de custos por projeto
create table if not exists projeto_custos (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid references projetos(id) on delete cascade not null,
  descricao   text not null,
  categoria   text not null default '',
  valor       numeric(14,2) not null default 0,
  tipo        text not null check (tipo in ('entrada', 'saida')),
  data        date,
  created_at  timestamptz not null default now()
);

alter table projeto_custos enable row level security;
create policy "owner" on projeto_custos using (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
);

-- Metas por projeto
create table if not exists projeto_metas (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid references projetos(id) on delete cascade not null,
  titulo      text not null,
  descricao   text not null default '',
  valor_meta  numeric,
  valor_atual numeric not null default 0,
  unidade     text not null default '',
  status      text not null default 'em_andamento' check (status in ('em_andamento', 'atingida', 'nao_atingida')),
  created_at  timestamptz not null default now()
);

alter table projeto_metas enable row level security;
create policy "owner" on projeto_metas using (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
);

-- Links por projeto
create table if not exists projeto_links (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid references projetos(id) on delete cascade not null,
  titulo      text not null,
  url         text not null,
  categoria   text not null default '',
  created_at  timestamptz not null default now()
);

alter table projeto_links enable row level security;
create policy "owner" on projeto_links using (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
);

-- Relatórios por projeto
create table if not exists projeto_relatorios (
  id               uuid primary key default gen_random_uuid(),
  projeto_id       uuid references projetos(id) on delete cascade not null,
  titulo           text not null,
  conteudo         text not null default '',
  data_referencia  date,
  created_at       timestamptz not null default now()
);

alter table projeto_relatorios enable row level security;
create policy "owner" on projeto_relatorios using (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
) with check (
  exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid())
);
