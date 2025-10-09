-- 1. CORREÇÃO URGENTE: Atualizar enum setor_type para valores corretos
ALTER TYPE setor_type RENAME TO setor_type_old;

CREATE TYPE setor_type AS ENUM ('Logística', 'Qualidade');

-- Atualizar tabela time_records para usar o novo tipo
ALTER TABLE time_records ALTER COLUMN setor TYPE setor_type USING setor::text::setor_type;

DROP TYPE setor_type_old;

-- 2. CONTROLE DE HORÁRIO DE ALMOÇO
-- Adicionar campos para saída e retorno do almoço
ALTER TABLE time_records 
  ADD COLUMN lunch_exit_time time without time zone,
  ADD COLUMN lunch_return_time time without time zone,
  ADD COLUMN lunch_hours numeric,
  ADD COLUMN lunch_discount numeric DEFAULT 0;

-- 3. SETORIZAÇÃO DE USUÁRIOS
-- Adicionar campo para indicar onde o funcionário pode trabalhar
CREATE TYPE work_location AS ENUM ('Matriz', 'Filial', 'Ambas');

ALTER TABLE employees 
  ADD COLUMN work_location work_location DEFAULT 'Ambas';

-- 4. CRIAR TABELA DE UNIDADES/LOCAIS DE TRABALHO
CREATE TABLE IF NOT EXISTS public.work_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL, -- 'Matriz' ou 'Filial'
  address text,
  latitude numeric,
  longitude numeric,
  radius_meters integer DEFAULT 100,
  qr_code_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64'),
  qr_code_version integer NOT NULL DEFAULT 1,
  qr_enabled boolean NOT NULL DEFAULT true,
  geo_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(company_id, name)
);

-- Habilitar RLS
ALTER TABLE public.work_locations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para work_locations
CREATE POLICY "Admins podem gerenciar locais de trabalho"
  ON public.work_locations
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Usuários podem visualizar locais da sua empresa"
  ON public.work_locations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.user_id = auth.uid()
      AND employees.company_id = work_locations.company_id
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_work_locations_updated_at
  BEFORE UPDATE ON public.work_locations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar referência de local na tabela time_records
ALTER TABLE time_records
  ADD COLUMN work_location_id uuid REFERENCES work_locations(id);

-- 5. MIGRAR DADOS EXISTENTES de company_qr_settings para work_locations
INSERT INTO work_locations (company_id, name, type, latitude, longitude, radius_meters, qr_code_token, qr_enabled, geo_enabled)
SELECT 
  company_id,
  'Unidade Principal' as name,
  'Matriz' as type,
  latitude,
  longitude,
  COALESCE(radius_meters, 100) as radius_meters,
  qr_code_token,
  qr_enabled,
  geo_enabled
FROM company_qr_settings
ON CONFLICT (company_id, name) DO NOTHING;

-- 6. ADICIONAR ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_time_records_employee_date ON time_records(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_time_records_work_location ON time_records(work_location_id);
CREATE INDEX IF NOT EXISTS idx_work_locations_company ON work_locations(company_id);