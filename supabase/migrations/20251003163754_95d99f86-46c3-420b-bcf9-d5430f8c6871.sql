-- Adicionar novos campos à tabela employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;