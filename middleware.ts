import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware de sessão e proteção de rotas.
 *
 * - Atualiza o cookie de sessão do Supabase em cada requisição.
 * - Redireciona usuários não autenticados que tentam acessar /dashboard.
 * - Redireciona usuários autenticados que tentam acessar /login ou /cadastro.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Obtém o usuário (valida o JWT junto ao Supabase Auth Server)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Rotas protegidas: requer autenticação
  const rotasProtegidas = ['/dashboard']
  // Rotas públicas exclusivas: redireciona se já estiver autenticado
  const rotasPublicasExclusivas = ['/login', '/cadastro']

  if (rotasProtegidas.some((rota) => pathname.startsWith(rota)) && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (rotasPublicasExclusivas.some((rota) => pathname.startsWith(rota)) && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
