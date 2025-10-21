-- Create table for route permissions
CREATE TABLE public.route_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  label TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(route, role)
);

-- Enable RLS
ALTER TABLE public.route_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Devs podem gerenciar permissões de rotas"
  ON public.route_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Usuários autenticados podem visualizar permissões"
  ON public.route_permissions
  FOR SELECT
  USING (true);

-- Insert default permissions for all routes
INSERT INTO public.route_permissions (route, label, role) VALUES
  -- Dashboard
  ('/dashboard', 'Dashboard', 'admin'),
  ('/dashboard', 'Dashboard', 'dev'),
  
  -- Empresas (apenas dev)
  ('/empresas', 'Empresas', 'dev'),
  
  -- Funcionários
  ('/funcionarios', 'Funcionários', 'admin'),
  ('/funcionarios', 'Funcionários', 'dev'),
  
  -- Ponto
  ('/ponto', 'Controle de Ponto', 'admin'),
  ('/ponto', 'Controle de Ponto', 'dev'),
  
  -- Ponto Eletrônico (todos podem acessar)
  ('/ponto-eletronico', 'Ponto Eletrônico', 'user'),
  ('/ponto-eletronico', 'Ponto Eletrônico', 'admin'),
  ('/ponto-eletronico', 'Ponto Eletrônico', 'dev'),
  ('/ponto-eletronico', 'Ponto Eletrônico', 'inputer'),
  
  -- Controle Ponto Simples
  ('/controle-ponto-simples', 'Controle Simples', 'inputer'),
  ('/controle-ponto-simples', 'Controle Simples', 'dev'),
  
  -- Relatórios
  ('/relatorios', 'Relatórios', 'admin'),
  ('/relatorios', 'Relatórios', 'dev'),
  
  -- QR Code
  ('/qrcode', 'QR Code', 'admin'),
  ('/qrcode', 'QR Code', 'dev'),
  
  -- Importar Dados
  ('/importar-dados', 'Importar Dados', 'dev'),
  
  -- Work Locations
  ('/work-locations', 'Locais de Trabalho', 'admin'),
  ('/work-locations', 'Locais de Trabalho', 'dev'),
  
  -- Gerenciamento de Roles (apenas dev)
  ('/gerenciamento-roles', 'Gerenciamento de Roles', 'dev'),
  
  -- Settings (todos podem acessar)
  ('/settings', 'Configurações', 'user'),
  ('/settings', 'Configurações', 'admin'),
  ('/settings', 'Configurações', 'dev'),
  ('/settings', 'Configurações', 'inputer'),
  
  -- Users
  ('/users', 'Usuários', 'admin'),
  ('/users', 'Usuários', 'dev');