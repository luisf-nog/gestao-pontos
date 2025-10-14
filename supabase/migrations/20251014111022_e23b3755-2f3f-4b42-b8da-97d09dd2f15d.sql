-- Adicionar campo de unidade de trabalho para funcionários
CREATE TYPE public.work_unit AS ENUM ('Matriz', 'Filial');

-- Adicionar coluna work_unit na tabela employees
ALTER TABLE public.employees 
ADD COLUMN work_unit public.work_unit[] DEFAULT ARRAY['Matriz']::work_unit[];

COMMENT ON COLUMN public.employees.work_unit IS 'Unidades de trabalho do funcionário (Matriz, Filial ou ambas)';