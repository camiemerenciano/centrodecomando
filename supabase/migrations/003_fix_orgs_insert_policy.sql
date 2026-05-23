-- Qualquer usuário autenticado pode criar uma organização
-- (vai virar owner via organization_members)
CREATE POLICY "orgs_insert" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
