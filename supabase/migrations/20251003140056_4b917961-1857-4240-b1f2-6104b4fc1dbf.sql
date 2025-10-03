-- Tornar campos de valores opcionais para permitir cálculo dinâmico
ALTER TABLE public.time_records 
  ALTER COLUMN daily_value DROP NOT NULL,
  ALTER COLUMN total_value DROP NOT NULL;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.time_records.daily_value IS 'Calculado dinamicamente com base nos valores atuais da empresa';
COMMENT ON COLUMN public.time_records.overtime_value IS 'Calculado dinamicamente com base nos valores atuais da empresa';
COMMENT ON COLUMN public.time_records.total_value IS 'Calculado dinamicamente com base nos valores atuais da empresa';