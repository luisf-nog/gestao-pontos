-- Adicionar campo de email pessoal
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS personal_email TEXT;

-- Atualizar política de DELETE para permitir apenas role 'dev'
DROP POLICY IF EXISTS "Apenas admins podem deletar funcionários" ON employees;

CREATE POLICY "Apenas devs podem deletar funcionários" 
ON employees 
FOR DELETE 
TO authenticated
USING (has_role(auth.uid(), 'dev'::app_role));