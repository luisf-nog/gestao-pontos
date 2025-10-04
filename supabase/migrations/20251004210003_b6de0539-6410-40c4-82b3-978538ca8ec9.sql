-- Add active status to employees table
ALTER TABLE public.employees 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Add index for better performance when filtering active employees
CREATE INDEX idx_employees_is_active ON public.employees(is_active);