create table if not exists empresa_estrutura (
  id            uuid primary key default gen_random_uuid(),
  empresa_id    uuid not null unique,
  dados         jsonb not null default '{}'::jsonb,
  missao        text not null default '',
  visao         text not null default '',
  valores       text not null default '',
  cultura       text not null default '',
  publico       text not null default '',
  persona       text not null default '',
  manual_marca  text not null default '',
  linguagem     text not null default '',
  o_que_fazemos text not null default '',
  updated_at    timestamptz not null default now()
);

alter table empresa_estrutura enable row level security;

drop policy if exists "owner" on empresa_estrutura;
create policy "owner" on empresa_estrutura
  using  (auth.uid() = (select owner_id from empresas where id = empresa_id))
  with check (auth.uid() = (select owner_id from empresas where id = empresa_id));
