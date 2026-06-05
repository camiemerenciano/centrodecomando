create table if not exists projeto_acao_dependencias (
  acao_id       uuid references projeto_acoes(id) on delete cascade not null,
  depende_de_id uuid references projeto_acoes(id) on delete cascade not null,
  primary key (acao_id, depende_de_id)
);

alter table projeto_acao_dependencias enable row level security;

drop policy if exists "owner" on projeto_acao_dependencias;
create policy "owner" on projeto_acao_dependencias
  using (exists (
    select 1 from projeto_acoes pa
    join projetos p on p.id = pa.projeto_id
    where pa.id = acao_id and p.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from projeto_acoes pa
    join projetos p on p.id = pa.projeto_id
    where pa.id = acao_id and p.user_id = auth.uid()
  ));
