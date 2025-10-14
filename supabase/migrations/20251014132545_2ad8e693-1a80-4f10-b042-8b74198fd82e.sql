-- Adicionar coluna CPF na tabela employees
ALTER TABLE public.employees ADD COLUMN cpf text;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.employees.cpf IS 'CPF do funcionário (formato: XXX.XXX.XXX-XX)';