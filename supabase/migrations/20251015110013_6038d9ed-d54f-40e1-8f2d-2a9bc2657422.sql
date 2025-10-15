-- Criar tabela de cargos
CREATE TABLE public.job_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  daily_rate NUMERIC NOT NULL,
  overtime_rate NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Adicionar índice para melhor performance
CREATE INDEX idx_job_positions_company_id ON public.job_positions(company_id);

-- Habilitar RLS
ALTER TABLE public.job_positions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Usuários autenticados podem ver cargos"
ON public.job_positions
FOR SELECT
USING (true);

CREATE POLICY "Apenas admins e devs podem inserir cargos"
ON public.job_positions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Apenas admins e devs podem atualizar cargos"
ON public.job_positions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Apenas admins e devs podem deletar cargos"
ON public.job_positions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

-- Adicionar trigger para updated_at
CREATE TRIGGER update_job_positions_updated_at
BEFORE UPDATE ON public.job_positions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna position_id na tabela employees
ALTER TABLE public.employees
ADD COLUMN position_id UUID REFERENCES public.job_positions(id) ON DELETE SET NULL;

-- Adicionar índice
CREATE INDEX idx_employees_position_id ON public.employees(position_id);