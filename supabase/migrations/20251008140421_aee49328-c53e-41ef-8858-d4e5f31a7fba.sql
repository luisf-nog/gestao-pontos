-- Adicionar política para admins e devs poderem inserir funcionários
DROP POLICY IF EXISTS "Apenas admins podem inserir funcionários" ON employees;

CREATE POLICY "Admins e devs podem inserir funcionários" 
ON employees 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'dev'::app_role)
);