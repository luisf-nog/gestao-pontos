-- Criar bucket para fotos de funcionários
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-photos', 'employee-photos', true);

-- Criar políticas para o bucket
CREATE POLICY "Fotos de funcionários são públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'employee-photos');

CREATE POLICY "Admins podem fazer upload de fotos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'employee-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins podem atualizar fotos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'employee-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins podem deletar fotos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'employee-photos' 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Adicionar coluna photo_url na tabela employees
ALTER TABLE public.employees
ADD COLUMN photo_url TEXT;