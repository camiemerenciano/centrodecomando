CREATE OR REPLACE FUNCTION public.setup_organization(org_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_slug   text;
BEGIN
  org_slug := lower(regexp_replace(org_name, '[^a-z0-9]+', '-', 'gi'));
  org_slug := trim(both '-' from org_slug);

  INSERT INTO public.organizations (name, slug)
  VALUES (org_name, org_slug)
  RETURNING id INTO new_org_id;

  INSERT INTO public.organization_members (org_id, user_id, role)
  VALUES (new_org_id, auth.uid(), 'owner');

  RETURN new_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.setup_organization TO authenticated;
