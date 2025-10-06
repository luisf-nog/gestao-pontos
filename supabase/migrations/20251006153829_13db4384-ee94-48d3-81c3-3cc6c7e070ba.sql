-- Criar tabela para configurações de QR Code e Geolocalização por empresa
CREATE TABLE IF NOT EXISTS public.company_qr_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  qr_code_token TEXT NOT NULL UNIQUE,
  qr_code_version INTEGER NOT NULL DEFAULT 1,
  qr_enabled BOOLEAN NOT NULL DEFAULT true,
  geo_enabled BOOLEAN NOT NULL DEFAULT true,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  radius_meters INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(company_id)
);

-- Criar tabela para logs de validação de ponto
CREATE TABLE IF NOT EXISTS public.point_validation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL CHECK (validation_type IN ('qr_code', 'geolocation', 'success', 'error')),
  validation_status TEXT NOT NULL CHECK (validation_status IN ('success', 'failed', 'invalid_qr', 'out_of_area', 'gps_disabled', 'qr_disabled', 'geo_disabled')),
  qr_code_provided TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  distance_meters NUMERIC(10, 2),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.company_qr_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_validation_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para company_qr_settings
CREATE POLICY "Admins podem gerenciar QR settings"
  ON public.company_qr_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Usuários podem visualizar QR settings da sua empresa"
  ON public.company_qr_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.user_id = auth.uid()
      AND employees.company_id = company_qr_settings.company_id
    )
  );

-- Políticas para point_validation_logs
CREATE POLICY "Admins podem visualizar todos os logs"
  ON public.point_validation_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Usuários podem inserir seus próprios logs"
  ON public.point_validation_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = point_validation_logs.employee_id
      AND employees.user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_company_qr_settings_updated_at
  BEFORE UPDATE ON public.company_qr_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_company_qr_settings_company_id ON public.company_qr_settings(company_id);
CREATE INDEX idx_company_qr_settings_qr_code_token ON public.company_qr_settings(qr_code_token);
CREATE INDEX idx_point_validation_logs_employee_id ON public.point_validation_logs(employee_id);
CREATE INDEX idx_point_validation_logs_created_at ON public.point_validation_logs(created_at DESC);