-- Allow devs to update employees as well
CREATE POLICY "Devs podem atualizar funcionários" 
ON public.employees
FOR UPDATE
USING (public.has_role(auth.uid(), 'dev'));

-- Note: existing admin update policy remains; either role can update.