-- Tarefas vinculadas a uma empresa devem ser visíveis para todos os membros
-- daquela empresa (dono + convidados), não só para quem criou ou foi atribuído.
-- Políticas permissivas são combinadas com OR pelo Postgres, então isto apenas
-- amplia a visibilidade existente sem remover as regras já aplicadas.

drop policy if exists "empresa_members_view_tarefas" on tarefas;
create policy "empresa_members_view_tarefas" on tarefas
  for select
  using (
    empresa_id is not null
    and (
      exists (select 1 from empresas e where e.id = tarefas.empresa_id and e.owner_id = auth.uid())
      or exists (select 1 from team_members tm where tm.member_id = auth.uid() and tm.empresa_id = tarefas.empresa_id)
    )
  );

drop policy if exists "empresa_members_view_tarefa_dependencias" on tarefa_dependencias;
create policy "empresa_members_view_tarefa_dependencias" on tarefa_dependencias
  for select
  using (
    exists (
      select 1 from tarefas t
      where t.id = tarefa_dependencias.tarefa_id
        and t.empresa_id is not null
        and (
          exists (select 1 from empresas e where e.id = t.empresa_id and e.owner_id = auth.uid())
          or exists (select 1 from team_members tm where tm.member_id = auth.uid() and tm.empresa_id = t.empresa_id)
        )
    )
  );
