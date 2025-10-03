-- Remover enum antigo e criar novo apenas com LOGISTICA e QUALIDADE
DROP TYPE IF EXISTS setor_type CASCADE;
CREATE TYPE setor_type AS ENUM ('LOGISTICA', 'QUALIDADE');

-- Recriar a coluna setor
ALTER TABLE time_records DROP COLUMN IF EXISTS setor;
ALTER TABLE time_records ADD COLUMN setor setor_type;