import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { employeeId, email, name } = await req.json();

    if (!employeeId || !email || !name) {
      throw new Error('employeeId, email e name são obrigatórios');
    }

    console.log('Criando usuário para funcionário:', { employeeId, email, name });

    // Criar usuário com senha padrão "123"
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: '123',
      email_confirm: true,
      user_metadata: {
        full_name: name,
        employee_id: employeeId
      }
    });

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      throw userError;
    }

    console.log('Usuário criado com sucesso:', userData.user.id);

    // Atualizar funcionário com user_id
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ user_id: userData.user.id })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Erro ao atualizar funcionário:', updateError);
      throw updateError;
    }

    // Adicionar role "user" ao funcionário
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userData.user.id,
        role: 'user'
      });

    if (roleError) {
      console.error('Erro ao adicionar role:', roleError);
      throw roleError;
    }

    console.log('Funcionário atualizado e role adicionada com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        userId: userData.user.id,
        message: 'Usuário criado com sucesso. Senha padrão: 123'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Erro na função create-employee-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});