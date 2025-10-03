-- Adicionar novo role 'dev' ao enum app_role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'dev';