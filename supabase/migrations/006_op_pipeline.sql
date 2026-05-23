CREATE TABLE public.op_pipeline_items (
  id                uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id            uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title             text        NOT NULL,
  description       text,
  client            text        NOT NULL,
  assignee_name     text,
  due_date          date,
  priority          text        NOT NULL DEFAULT 'medium', -- low | medium | high | urgent
  stage             text        NOT NULL DEFAULT 'producao', -- producao | aprovacao | postagem
  position          int         NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.op_pipeline_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_pipeline_all" ON public.op_pipeline_items
  FOR ALL USING (is_org_member(org_id));

COMMENT ON COLUMN public.op_pipeline_items.stage IS
  'producao | aprovacao | postagem';
