-- Remover políticas antigas de INSERT, UPDATE e DELETE para companies
DROP POLICY IF EXISTS "Apenas admins podem inserir empresas" ON companies;
DROP POLICY IF EXISTS "Apenas admins podem atualizar empresas" ON companies;
DROP POLICY IF EXISTS "Apenas admins podem deletar empresas" ON companies;
DROP POLICY IF EXISTS "Apenas devs podem inserir empresas" ON companies;
DROP POLICY IF EXISTS "Apenas devs podem atualizar empresas" ON companies;
DROP POLICY IF EXISTS "Apenas devs podem deletar empresas" ON companies;

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