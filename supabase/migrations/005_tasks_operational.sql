-- Update tasks status to operational values
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'novo';

-- Add conversation origin reference
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE SET NULL;

-- Comment on status values for documentation
COMMENT ON COLUMN public.tasks.status IS
  'novo | em_andamento | aguardando_cliente | revisao | concluido';
