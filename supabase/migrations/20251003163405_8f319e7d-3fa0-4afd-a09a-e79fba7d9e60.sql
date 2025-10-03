-- Deletar funcionários da empresa PONTUAL
DELETE FROM employees 
WHERE company_id IN (
  SELECT id FROM companies WHERE name = 'PONTUAL'
);

-- Deletar registros de ponto relacionados aos funcionários da PONTUAL (caso existam órfãos)
DELETE FROM time_records 
WHERE employee_id NOT IN (SELECT id FROM employees);