-- Remover coluna photo_url da tabela employees
ALTER TABLE public.employees DROP COLUMN IF EXISTS photo_url;

-- Remover políticas do bucket employee-photos
DROP POLICY IF EXISTS "Admins podem deletar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem atualizar fotos" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem fazer upload de fotos" ON storage.objects;
DROP POLICY IF EXISTS "Fotos de funcionários são públicas" ON storage.objects;

-- Deletar bucket (isso remove todos os arquivos!)
DELETE FROM storage.buckets WHERE id = 'employee-photos';