-- Criar enum para os setores
CREATE TYPE public.setor_type AS ENUM ('QUALIDADE', 'LOGÍSTICA');

-- Adicionar coluna setor na tabela time_records
ALTER TABLE public.time_records 
ADD COLUMN setor setor_type;