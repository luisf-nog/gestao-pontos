-- Adicionar campo email aos funcionários
ALTER TABLE public.employees 
ADD COLUMN email TEXT UNIQUE;

-- Adicionar campo user_id para vincular com auth.users
ALTER TABLE public.employees 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Criar índice para melhor performance
CREATE INDEX idx_employees_email ON public.employees(email);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);

-- Comentários explicativos
COMMENT ON COLUMN public.employees.email IS 'Email usado para login do funcionário no ponto eletrônico';
COMMENT ON COLUMN public.employees.user_id IS 'Vínculo com usuário de autenticação para ponto eletrônico';