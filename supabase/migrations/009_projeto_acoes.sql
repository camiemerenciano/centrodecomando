create table if not exists projeto_acoes (
  id          uuid primary key default gen_random_uuid(),
  projeto_id  uuid references projetos(id) on delete cascade not null,
  titulo      text not null,
  descricao   text not null default '',
  responsavel text not null default '',
  prazo       date,
  prioridade  text not null default 'medium' check (prioridade in ('low', 'medium', 'high', 'urgent')),
  status      text not null default 'fazer' check (status in ('fazer', 'fazendo', 'feito')),
  ordem       integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table projeto_acoes enable row level security;

drop policy if exists "owner" on projeto_acoes;
create policy "owner" on projeto_acoes
  using  (exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid()))
  with check (exists (select 1 from projetos p where p.id = projeto_id and p.user_id = auth.uid()));
