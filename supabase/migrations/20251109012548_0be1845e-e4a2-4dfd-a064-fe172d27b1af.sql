-- Remover o trigger problemático que impede remix
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- A função handle_new_user() é mantida mas não será usada automaticamente
-- O profile e role serão criados via Edge Functions ou após signup no frontend