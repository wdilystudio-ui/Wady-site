'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TipoUsuario = 'Cliente' | 'Profissional'

type FormState = {
  nome: string
  email: string
  senha: string
  confirmarSenha: string
  tipo_usuario: TipoUsuario
  bio: string
  categoria: string
  aceitaTermos: boolean
}

type ErrosForm = Partial<Record<keyof FormState, string>>

// ─── Dados ────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  { valor: 'Diarista', icone: '🧹' },
  { valor: 'Eletricista', icone: '⚡' },
  { valor: 'Encanador', icone: '🔧' },
  { valor: 'Pedreiro', icone: '🧱' },
  { valor: 'Pintor', icone: '🖌️' },
  { valor: 'Marceneiro', icone: '🪚' },
  { valor: 'Jardineiro', icone: '🌿' },
  { valor: 'Técnico em informática', icone: '💻' },
  { valor: 'Cozinheiro', icone: '👨‍🍳' },
  { valor: 'Designer', icone: '🎨' },
  { valor: 'Fotógrafo', icone: '📷' },
  { valor: 'Personal trainer', icone: '🏋️' },
  { valor: 'Motorista', icone: '🚗' },
  { valor: 'Segurança', icone: '🛡️' },
  { valor: 'Outro', icone: '🔑' },
]

// ─── Helpers de validação ────────────────────────────────────────────────────

function validarFormulario(form: FormState): ErrosForm {
  const erros: ErrosForm = {}

  if (!form.nome.trim() || form.nome.trim().length < 3)
    erros.nome = 'Informe seu nome completo (mínimo 3 caracteres).'

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.email))
    erros.email = 'Informe um e-mail válido.'

  if (form.senha.length < 8)
    erros.senha = 'A senha deve ter pelo menos 8 caracteres.'

  if (!/[A-Z]/.test(form.senha))
    erros.senha = 'A senha deve conter ao menos uma letra maiúscula.'

  if (!/[0-9]/.test(form.senha))
    erros.senha = 'A senha deve conter ao menos um número.'

  if (form.senha !== form.confirmarSenha)
    erros.confirmarSenha = 'As senhas não coincidem.'

  if (form.tipo_usuario === 'Profissional') {
    if (!form.bio.trim() || form.bio.trim().length < 20)
      erros.bio = 'Descreva sua experiência (mínimo 20 caracteres).'
    if (!form.categoria)
      erros.categoria = 'Selecione uma categoria de atuação.'
  }

  if (!form.aceitaTermos)
    erros.aceitaTermos = 'Você precisa aceitar os termos para continuar.'

  return erros
}

function traduzirErroSupabase(mensagem: string): string {
  if (mensagem.includes('User already registered') || mensagem.includes('already been registered'))
    return 'Este e-mail já está cadastrado. Tente fazer login ou recuperar a senha.'
  if (mensagem.includes('Password should be at least'))
    return 'Sua senha é muito fraca. Use ao menos 8 caracteres com letras e números.'
  if (mensagem.includes('Invalid email'))
    return 'O endereço de e-mail informado é inválido.'
  if (mensagem.includes('Email rate limit'))
    return 'Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.'
  if (mensagem.includes('duplicate key') || mensagem.includes('perfis_user_id_unique'))
    return 'Já existe um perfil vinculado a este e-mail. Tente fazer login.'
  return 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.'
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function PasswordStrength({ senha }: { senha: string }) {
  if (!senha) return null

  const requisitos = [
    { ok: senha.length >= 8, label: 'Mínimo 8 caracteres' },
    { ok: /[A-Z]/.test(senha), label: 'Uma letra maiúscula' },
    { ok: /[0-9]/.test(senha), label: 'Um número' },
    { ok: /[^A-Za-z0-9]/.test(senha), label: 'Um símbolo (opcional)' },
  ]

  const pontos = requisitos.filter((r) => r.ok).length
  const forca = pontos <= 1 ? 'Fraca' : pontos === 2 ? 'Média' : pontos === 3 ? 'Boa' : 'Forte'
  const cor =
    pontos <= 1
      ? 'bg-red-400'
      : pontos === 2
        ? 'bg-amber-400'
        : pontos === 3
          ? 'bg-blue-400'
          : 'bg-emerald-400'
  const largura = `${(pontos / 4) * 100}%`

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${cor}`}
            style={{ width: largura }}
          />
        </div>
        <span className="text-xs font-medium text-zinc-500">{forca}</span>
      </div>
      <ul className="grid grid-cols-2 gap-1">
        {requisitos.map((r) => (
          <li
            key={r.label}
            className={`flex items-center gap-1 text-xs transition-colors ${r.ok ? 'text-emerald-600' : 'text-zinc-400'}`}
          >
            <span className="text-[10px]">{r.ok ? '✓' : '○'}</span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CampoTexto({
  id,
  label,
  erro,
  children,
}: {
  id: string
  label: string
  erro?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
      {erro && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
          <span className="mt-px shrink-0">⚠</span>
          {erro}
        </p>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CadastroPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(false)
  const [erroGlobal, setErroGlobal] = useState('')
  const [mensagemSucesso, setMensagemSucesso] = useState('')
  const [errosForm, setErrosForm] = useState<ErrosForm>({})
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [etapa, setEtapa] = useState<1 | 2>(1) // etapa 1: dados básicos | etapa 2: dados do perfil

  const [form, setForm] = useState<FormState>({
    nome: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    tipo_usuario: 'Cliente',
    bio: '',
    categoria: '',
    aceitaTermos: false,
  })

  const isProfissional = form.tipo_usuario === 'Profissional'

  // ─── Handlers ───────────────────────────────────────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value, type } = e.target
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    setForm((prev) => ({ ...prev, [name]: val }))
    // Limpa erro do campo ao editar
    if (errosForm[name as keyof FormState]) {
      setErrosForm((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleTipoUsuario(tipo: TipoUsuario) {
    setForm((prev) => ({ ...prev, tipo_usuario: tipo, bio: '', categoria: '' }))
  }

  function avancarEtapa() {
    const erros = validarFormulario(form)
    const errosEtapa1: ErrosForm = {}
    const camposEtapa1: (keyof FormState)[] = ['nome', 'email', 'senha', 'confirmarSenha']
    camposEtapa1.forEach((c) => {
      if (erros[c]) errosEtapa1[c] = erros[c]
    })

    if (Object.keys(errosEtapa1).length > 0) {
      setErrosForm(errosEtapa1)
      return
    }
    setErrosForm({})
    setEtapa(2)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErroGlobal('')

    const erros = validarFormulario(form)
    if (Object.keys(erros).length > 0) {
      setErrosForm(erros)
      return
    }

    setLoading(true)

    try {
      // 1. Registra no Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: form.email.trim().toLowerCase(),
        password: form.senha,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          data: {
            nome: form.nome.trim(),
            tipo_usuario: form.tipo_usuario,
          },
        },
      })

      if (authError) {
        throw new Error(traduzirErroSupabase(authError.message))
      }

      const user = data.user
      if (!user?.id) {
        throw new Error('Não foi possível obter o ID do usuário. Tente novamente.')
      }

      // 2. Insere perfil complementar na tabela `perfis`
      const { error: perfilError } = await supabase.from('perfis').insert({
        user_id: user.id,
        nome: form.nome.trim(),
        tipo_usuario: form.tipo_usuario,
        bio: isProfissional ? form.bio.trim() : null,
        categoria: isProfissional ? form.categoria : null,
        foto_url: null,
      })

      if (perfilError) {
        // Não bloqueia o fluxo se o perfil já existir (idempotência)
        if (!perfilError.message.includes('duplicate')) {
          throw new Error(traduzirErroSupabase(perfilError.message))
        }
      }

      // 3. Redireciona ou mostra confirmação de e-mail
      if (data.session) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      setMensagemSucesso(
        'Cadastro realizado com sucesso! Enviamos um e-mail de confirmação. Verifique sua caixa de entrada.'
      )
      setTimeout(() => router.push('/login?confirmacao=1'), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado. Tente novamente.'
      setErroGlobal(msg)
    } finally {
      setLoading(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  const inputClass = (campo: keyof FormState) =>
    `w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all duration-200 bg-white
    ${errosForm[campo]
      ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-zinc-200 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-100'
    }`

  return (
    <main className="min-h-screen px-4 py-8 sm:py-12">
      {/* Card principal */}
      <div className="mx-auto max-w-lg">

        {/* Cabeçalho */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/logo-wady.png"
            alt="Logo Wady"
            width={80}
            height={80}
            className="mb-4 rounded-2xl object-contain shadow-md"
            priority
          />
          <h1 className="text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl">
            Criar conta gratuita
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Conecte-se aos melhores profissionais ou ofereça seus serviços na Wady.
          </p>
        </div>

        {/* Indicador de etapas */}
        <div className="mb-6 flex items-center justify-center gap-3">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-3">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  etapa === n
                    ? 'bg-zinc-950 text-white shadow-md'
                    : n < etapa
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-100 text-zinc-400'
                }`}
              >
                {n < etapa ? '✓' : n}
              </div>
              {n < 2 && (
                <div
                  className={`h-px w-12 transition-all duration-500 ${etapa > 1 ? 'bg-emerald-400' : 'bg-zinc-200'}`}
                />
              )}
            </div>
          ))}
          <span className="ml-2 text-xs font-medium text-zinc-400">
            {etapa === 1 ? 'Dados de acesso' : 'Perfil'}
          </span>
        </div>

        {/* Card do formulário */}
        <div className="rounded-[28px] bg-white p-6 shadow-sm ring-1 ring-zinc-100 sm:p-8">

          {/* Mensagem de sucesso */}
          {mensagemSucesso && (
            <div className="mb-6 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-700 ring-1 ring-emerald-200">
              <span className="mt-0.5 shrink-0 text-base">🎉</span>
              <p>{mensagemSucesso}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── ETAPA 1: Dados de acesso ── */}
            {etapa === 1 && (
              <div className="space-y-5">

                {/* Seleção de tipo de usuário */}
                <div>
                  <p className="mb-2 text-sm font-medium text-zinc-700">
                    Quero me cadastrar como:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {(['Cliente', 'Profissional'] as TipoUsuario[]).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => handleTipoUsuario(tipo)}
                        className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 p-4 text-center transition-all duration-200 focus:outline-none ${
                          form.tipo_usuario === tipo
                            ? 'border-zinc-900 bg-zinc-950 text-white shadow-md'
                            : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50'
                        }`}
                      >
                        <span className="text-2xl">
                          {tipo === 'Cliente' ? '🧑‍💼' : '🔨'}
                        </span>
                        <span className="text-sm font-semibold">{tipo}</span>
                        <span
                          className={`text-xs leading-tight ${
                            form.tipo_usuario === tipo ? 'text-zinc-300' : 'text-zinc-400'
                          }`}
                        >
                          {tipo === 'Cliente'
                            ? 'Contrato serviços'
                            : 'Ofereço serviços'}
                        </span>
                        {form.tipo_usuario === tipo && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] text-zinc-950">
                            ✓
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Nome */}
                <CampoTexto id="nome" label="Nome completo" erro={errosForm.nome}>
                  <input
                    id="nome"
                    name="nome"
                    type="text"
                    value={form.nome}
                    onChange={handleChange}
                    placeholder="Ex.: João Silva"
                    autoComplete="name"
                    className={inputClass('nome')}
                  />
                </CampoTexto>

                {/* E-mail */}
                <CampoTexto id="email" label="E-mail" erro={errosForm.email}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="voce@email.com"
                    autoComplete="email"
                    className={inputClass('email')}
                  />
                </CampoTexto>

                {/* Senha */}
                <CampoTexto id="senha" label="Senha" erro={errosForm.senha}>
                  <div className="relative">
                    <input
                      id="senha"
                      name="senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      value={form.senha}
                      onChange={handleChange}
                      placeholder="Mínimo 8 caracteres"
                      autoComplete="new-password"
                      className={inputClass('senha')}
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha((v) => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400 hover:text-zinc-700"
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <PasswordStrength senha={form.senha} />
                </CampoTexto>

                {/* Confirmar senha */}
                <CampoTexto id="confirmarSenha" label="Confirmar senha" erro={errosForm.confirmarSenha}>
                  <input
                    id="confirmarSenha"
                    name="confirmarSenha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.confirmarSenha}
                    onChange={handleChange}
                    placeholder="Repita a senha"
                    autoComplete="new-password"
                    className={inputClass('confirmarSenha')}
                  />
                </CampoTexto>

                <button
                  type="button"
                  onClick={avancarEtapa}
                  className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98]"
                >
                  Continuar →
                </button>
              </div>
            )}

            {/* ── ETAPA 2: Perfil ── */}
            {etapa === 2 && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className="mb-1 flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-700"
                >
                  ← Voltar
                </button>

                {/* Resumo do tipo */}
                <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 px-4 py-3 ring-1 ring-zinc-100">
                  <span className="text-xl">{isProfissional ? '🔨' : '🧑‍💼'}</span>
                  <div>
                    <p className="text-sm font-semibold text-zinc-800">{form.tipo_usuario}</p>
                    <p className="text-xs text-zinc-400">{form.email}</p>
                  </div>
                </div>

                {/* Campos para Profissional */}
                {isProfissional ? (
                  <>
                    <CampoTexto id="categoria" label="Área de atuação" erro={errosForm.categoria}>
                      <select
                        id="categoria"
                        name="categoria"
                        value={form.categoria}
                        onChange={handleChange}
                        className={inputClass('categoria')}
                      >
                        <option value="">Selecione sua especialidade</option>
                        {CATEGORIAS.map((cat) => (
                          <option key={cat.valor} value={cat.valor}>
                            {cat.icone} {cat.valor}
                          </option>
                        ))}
                      </select>
                    </CampoTexto>

                    <CampoTexto
                      id="bio"
                      label="Sobre você"
                      erro={errosForm.bio}
                    >
                      <textarea
                        id="bio"
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        rows={4}
                        maxLength={500}
                        placeholder="Conte sua experiência, diferenciais e serviços que oferece..."
                        className={`${inputClass('bio')} resize-none`}
                      />
                      <p className="mt-1 text-right text-xs text-zinc-400">
                        {form.bio.length}/500
                      </p>
                    </CampoTexto>
                  </>
                ) : (
                  <div className="rounded-2xl bg-blue-50 px-4 py-4 text-sm text-blue-700 ring-1 ring-blue-100">
                    <p className="font-semibold">Tudo pronto! 🎉</p>
                    <p className="mt-1 text-xs leading-relaxed text-blue-600">
                      Como cliente, você já pode navegar e contratar profissionais assim que confirmar seu e-mail.
                    </p>
                  </div>
                )}

                {/* Aceite de termos */}
                <div>
                  <label className="flex cursor-pointer items-start gap-3">
                    <input
                      type="checkbox"
                      name="aceitaTermos"
                      checked={form.aceitaTermos}
                      onChange={handleChange}
                      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded accent-zinc-950"
                    />
                    <span className="text-xs leading-relaxed text-zinc-500">
                      Li e concordo com os{' '}
                      <a href="/termos" target="_blank" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
                        Termos de Uso
                      </a>{' '}
                      e a{' '}
                      <a href="/privacidade" target="_blank" className="font-medium text-zinc-800 underline underline-offset-2 hover:text-zinc-950">
                        Política de Privacidade
                      </a>{' '}
                      da Wady.
                    </span>
                  </label>
                  {errosForm.aceitaTermos && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
                      <span>⚠</span> {errosForm.aceitaTermos}
                    </p>
                  )}
                </div>

                {/* Erro global */}
                {erroGlobal && (
                  <div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">
                    <span className="mt-0.5 shrink-0">⚠️</span>
                    <p>{erroGlobal}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !!mensagemSucesso}
                  className="w-full rounded-2xl bg-zinc-950 px-4 py-3.5 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                      </svg>
                      Criando conta...
                    </span>
                  ) : (
                    'Criar conta gratuita'
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Rodapé */}
        <p className="mt-5 text-center text-sm text-zinc-500">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-700">
            Entrar
          </Link>
        </p>

        {/* Segurança */}
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-zinc-400">
          <span>🔒</span> Seus dados são protegidos com criptografia de ponta a ponta.
        </p>
      </div>
    </main>
  )
}
