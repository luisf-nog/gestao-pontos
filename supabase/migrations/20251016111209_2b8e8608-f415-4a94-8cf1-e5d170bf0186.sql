-- Adicionar novo role 'inputer' ao enum app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'inputer';