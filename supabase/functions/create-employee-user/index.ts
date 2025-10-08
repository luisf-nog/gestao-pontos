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

    // Helper: encontra usuário por email via API admin (paginada)
    const findUserByEmail = async (emailToFind: string) => {
      let page = 1;
      const perPage = 200;
      while (true) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error('Erro ao listar usuários:', error);
          throw error;
        }
        const users = data?.users ?? [];
        const found = users.find((u: any) => (u.email ?? '').toLowerCase() === emailToFind.toLowerCase());
        if (found) return found;
        if (users.length < perPage) break; // última página
        page++;
      }
      return null;
    };

    console.log('Processando criação/vínculo de usuário para funcionário:', { employeeId, email, name });

    // 1) Tenta localizar usuário existente por email
    let targetUser: any = await findUserByEmail(email);
    let createdNewUser = false;

    // 2) Se não existir, cria
    if (!targetUser) {
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
        // Se email já existe, busca novamente e segue com vínculo
        if ((userError as any).code === 'email_exists' || (userError as any).message?.toLowerCase().includes('already been registered')) {
          console.warn('Email já registrado, vinculando usuário existente');
          targetUser = await findUserByEmail(email);
          if (!targetUser) throw userError; // fallback
        } else {
          console.error('Erro ao criar usuário:', userError);
          throw userError;
        }
      } else {
        createdNewUser = true;
        targetUser = userData?.user;
        console.log('Usuário criado com sucesso:', targetUser?.id);
      }
    } else {
      console.log('Usuário já existia, prosseguindo com vínculo:', targetUser.id);
    }

    // 3) Atualiza funcionário com user_id
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ user_id: targetUser.id })
      .eq('id', employeeId);

    if (updateError) {
      console.error('Erro ao atualizar funcionário:', updateError);
      throw updateError;
    }

    // 4) Garante role "user" com upsert (idempotente)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert({
        user_id: targetUser.id,
        role: 'user'
      }, {
        onConflict: 'user_id,role',
        ignoreDuplicates: true
      });

    if (roleError) {
      console.error('Erro ao adicionar role:', roleError);
      throw roleError;
    }

    const msg = createdNewUser
      ? 'Usuário criado e vinculado com sucesso. Senha padrão: 123'
      : 'Usuário já existia. Vinculado ao funcionário e role garantida.';

    return new Response(
      JSON.stringify({ success: true, userId: targetUser.id, message: msg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Erro na função create-employee-user:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});