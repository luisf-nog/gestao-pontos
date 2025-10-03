-- Criar ENUM para setores se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'setor_type') THEN
        CREATE TYPE setor_type AS ENUM ('LOGISTICA', 'QUALIDADE', 'PRODUCAO', 'ADMINISTRATIVO', 'OUTROS');
    END IF;
END $$;

-- Adicionar coluna setor à tabela time_records se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'time_records' AND column_name = 'setor'
    ) THEN
        ALTER TABLE time_records ADD COLUMN setor setor_type;
    END IF;
END $$;

-- Tornar exit_time nullable para permitir registros apenas com entrada
ALTER TABLE time_records ALTER COLUMN exit_time DROP NOT NULL;

-- Atualizar worked_hours para ser nullable também (será calculado quando houver saída)
ALTER TABLE time_records ALTER COLUMN worked_hours DROP NOT NULL;