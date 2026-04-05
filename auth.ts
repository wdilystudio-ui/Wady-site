'use server'

/**
 * actions/auth.ts
 * Server Actions para operações de autenticação e perfil.
 * Mantém a lógica de integração com Supabase separada do componente de UI.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type CadastroPayload = {
  nome: string
  email: string
  senha: string
  tipo_usuario: 'Cliente' | 'Profissional'
  bio?: string
  categoria?: string
}

export type CadastroResult =
  | { sucesso: true; precisaConfirmarEmail: boolean }
  | { sucesso: false; erro: string }

/**
 * Traduz mensagens de erro do Supabase para o português.
 */
function traduzirErro(msg: string): string {
  if (msg.includes('User already registered') || msg.includes('already been registered'))
    return 'Este e-mail já está cadastrado. Faça login ou recupere sua senha.'
  if (msg.includes('Password should be at least'))
    return 'Senha muito fraca. Use ao menos 8 caracteres com letras e números.'
  if (msg.includes('Invalid email'))
    return 'O e-mail informado é inválido.'
  if (msg.includes('Email rate limit'))
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  if (msg.includes('duplicate key') || msg.includes('perfis_user_id_unique'))
    return 'Já existe uma conta com este e-mail. Tente fazer login.'
  return 'Erro inesperado. Tente novamente em alguns instantes.'
}

/**
 * Registra um novo usuário e cria seu perfil complementar.
 *
 * Fluxo:
 * 1. Cria usuário no Supabase Auth.
 * 2. Insere dados complementares na tabela `perfis`.
 * 3. Retorna se o usuário precisa confirmar o e-mail.
 */
export async function cadastrarUsuario(payload: CadastroPayload): Promise<CadastroResult> {
  const supabase = await createClient()

  try {
    // ── Passo 1: Criar usuário no Auth ──────────────────────────────────────
    const { data, error: authError } = await supabase.auth.signUp({
      email: payload.email.trim().toLowerCase(),
      password: payload.senha,
      options: {
        // O redirect vai para /auth/callback que troca o code pela session
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/dashboard`,
        data: {
          nome: payload.nome.trim(),
          tipo_usuario: payload.tipo_usuario,
        },
      },
    })

    if (authError) {
      return { sucesso: false, erro: traduzirErro(authError.message) }
    }

    const user = data.user
    if (!user?.id) {
      return { sucesso: false, erro: 'Não foi possível criar sua conta. Tente novamente.' }
    }

    // ── Passo 2: Inserir perfil complementar ────────────────────────────────
    const { error: perfilError } = await supabase.from('perfis').insert({
      user_id: user.id,
      nome: payload.nome.trim(),
      tipo_usuario: payload.tipo_usuario,
      bio: payload.tipo_usuario === 'Profissional' ? (payload.bio?.trim() ?? null) : null,
      categoria: payload.tipo_usuario === 'Profissional' ? (payload.categoria ?? null) : null,
      foto_url: null,
    })

    if (perfilError && !perfilError.message.includes('duplicate')) {
      // Perfil não foi salvo — registra no log mas não bloqueia o cadastro
      console.error('[Wady] Erro ao salvar perfil:', perfilError.message)
      return {
        sucesso: false,
        erro: 'Conta criada, mas houve um problema ao salvar seu perfil. Entre em contato com o suporte.',
      }
    }

    // ── Passo 3: Verificar se há sessão ativa ou se precisa confirmar e-mail ─
    const precisaConfirmarEmail = !data.session

    return { sucesso: true, precisaConfirmarEmail }
  } catch (err: unknown) {
    console.error('[Wady] Erro no cadastro:', err)
    return {
      sucesso: false,
      erro: err instanceof Error ? traduzirErro(err.message) : 'Erro inesperado.',
    }
  }
}

/**
 * Server Action para logout — pode ser chamada por um formulário ou botão.
 */
export async function fazerLogout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
