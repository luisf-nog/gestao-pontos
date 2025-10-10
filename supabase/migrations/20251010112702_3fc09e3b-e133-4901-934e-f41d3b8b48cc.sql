-- Criar tabela de relação many-to-many entre funcionários e locais de trabalho
CREATE TABLE IF NOT EXISTS public.employee_work_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_location_id uuid NOT NULL REFERENCES public.work_locations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(employee_id, work_location_id)
);

-- Habilitar RLS
ALTER TABLE public.employee_work_locations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins podem gerenciar locais autorizados" 
ON public.employee_work_locations 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Usuários podem visualizar seus locais autorizados" 
ON public.employee_work_locations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM employees 
    WHERE employees.id = employee_work_locations.employee_id 
    AND employees.user_id = auth.uid()
  )
);

-- Adicionar índices para performance
CREATE INDEX idx_employee_work_locations_employee ON public.employee_work_locations(employee_id);
CREATE INDEX idx_employee_work_locations_location ON public.employee_work_locations(work_location_id);

-- Migrar dados existentes da coluna work_location para a nova tabela
-- Primeiro, vamos verificar se existe algum funcionário com work_location definido
-- e criar os registros correspondentes na nova tabela
INSERT INTO public.employee_work_locations (employee_id, work_location_id)
SELECT DISTINCT 
  e.id as employee_id,
  wl.id as work_location_id
FROM public.employees e
CROSS JOIN public.work_locations wl
WHERE e.work_location = 'Ambas'
ON CONFLICT (employee_id, work_location_id) DO NOTHING;

INSERT INTO public.employee_work_locations (employee_id, work_location_id)
SELECT DISTINCT 
  e.id as employee_id,
  wl.id as work_location_id
FROM public.employees e
JOIN public.work_locations wl ON wl.company_id = e.company_id
WHERE e.work_location = 'Matriz' AND wl.type = 'Matriz'
ON CONFLICT (employee_id, work_location_id) DO NOTHING;

INSERT INTO public.employee_work_locations (employee_id, work_location_id)
SELECT DISTINCT 
  e.id as employee_id,
  wl.id as work_location_id
FROM public.employees e
JOIN public.work_locations wl ON wl.company_id = e.company_id
WHERE e.work_location = 'Filial' AND wl.type = 'Filial'
ON CONFLICT (employee_id, work_location_id) DO NOTHING;