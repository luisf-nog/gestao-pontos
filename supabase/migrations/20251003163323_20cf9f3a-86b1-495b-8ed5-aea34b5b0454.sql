-- Deletar funcionários da empresa PONTUAL
DELETE FROM employees 
WHERE company_id IN (
  SELECT id FROM companies WHERE name = 'PONTUAL'
);

-- Deletar registros de ponto relacionados aos funcionários da PONTUAL (caso existam órfãos)
DELETE FROM time_records 
WHERE employee_id NOT IN (SELECT id FROM employees);

-- Atualizar políticas RLS da tabela companies para permitir apenas role 'dev'

-- Remover políticas antigas
DROP POLICY IF EXISTS "Apenas admins podem inserir empresas" ON companies;
DROP POLICY IF EXISTS "Apenas admins podem atualizar empresas" ON companies;
DROP POLICY IF EXISTS "Apenas admins podem deletar empresas" ON companies;

-- Criar novas políticas apenas para role 'dev'
CREATE POLICY "Apenas devs podem inserir empresas" 
ON companies 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Apenas devs podem atualizar empresas" 
ON companies 
FOR UPDATE 
TO authenticated
USING (has_role(auth.uid(), 'dev'::app_role));

CREATE POLICY "Apenas devs podem deletar empresas" 
ON companies 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'dev'::app_role));