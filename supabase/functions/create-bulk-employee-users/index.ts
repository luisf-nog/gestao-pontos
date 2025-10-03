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

    console.log('Buscando funcionários sem usuário...');

    // Buscar todos os funcionários que não têm user_id
    const { data: employees, error: fetchError } = await supabaseAdmin
      .from('employees')
      .select('id, name, company_id, companies!inner(name)')
      .is('user_id', null) as { data: Array<{
        id: string;
        name: string;
        company_id: string;
        companies: { name: string };
      }> | null; error: any };

    if (fetchError) {
      console.error('Erro ao buscar funcionários:', fetchError);
      throw fetchError;
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nenhum funcionário sem usuário encontrado',
          processed: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log(`Encontrados ${employees.length} funcionários sem usuário`);

    const results = {
      success: 0,
      errors: 0,
      details: [] as any[]
    };

    // Processar cada funcionário
    for (const employee of employees) {
      try {
        // Gerar email baseado no nome e empresa
        const normalizedName = employee.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '.');
        
        const normalizedCompany = employee.companies.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '')
          .replace(/[^a-z0-9]/g, '');
        
        const email = `${normalizedName}@${normalizedCompany}.com.br`;

        console.log(`Criando usuário para ${employee.name} com email ${email}`);

        // Criar usuário
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: '123',
          email_confirm: true,
          user_metadata: {
            full_name: employee.name,
            employee_id: employee.id
          }
        });

        if (userError) {
          console.error(`Erro ao criar usuário para ${employee.name}:`, userError);
          results.errors++;
          results.details.push({
            employee: employee.name,
            email,
            error: userError.message
          });
          continue;
        }

        // Atualizar funcionário com user_id e email
        const { error: updateError } = await supabaseAdmin
          .from('employees')
          .update({ 
            user_id: userData.user.id,
            email: email
          })
          .eq('id', employee.id);

        if (updateError) {
          console.error(`Erro ao atualizar funcionário ${employee.name}:`, updateError);
          results.errors++;
          results.details.push({
            employee: employee.name,
            email,
            error: updateError.message
          });
          continue;
        }

        // Adicionar role "user"
        const { error: roleError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: userData.user.id,
            role: 'user'
          });

        if (roleError) {
          console.error(`Erro ao adicionar role para ${employee.name}:`, roleError);
          results.errors++;
          results.details.push({
            employee: employee.name,
            email,
            error: roleError.message
          });
          continue;
        }

        results.success++;
        results.details.push({
          employee: employee.name,
          email,
          status: 'success'
        });

        console.log(`Usuário criado com sucesso para ${employee.name}`);

      } catch (err) {
        const error = err as Error;
        console.error(`Erro ao processar ${employee.name}:`, error);
        results.errors++;
        results.details.push({
          employee: employee.name,
          error: error.message
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: employees.length,
        successful: results.success,
        failed: results.errors,
        details: results.details,
        message: `Processados ${employees.length} funcionários. ${results.success} sucesso(s), ${results.errors} erro(s).`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na função create-bulk-employee-users:', error);
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
