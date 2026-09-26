import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // ─── Dev bypass ───────────────────────────────────────────────
  // Set NEXT_PUBLIC_BYPASS_AUTH=true in .env to skip auth entirely.
  // Remove / set to false before connecting real Supabase credentials.
  if (process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true') {
    // Only redirect /login → / so the shell is reachable directly
    if (request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // ─── Production auth (Supabase session refresh) ───────────────
  const { createServerClient } = await import('@supabase/ssr')

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  // Client-facing links must open without a CRM login. Trailing slashes keep the internal /proposals page protected.
  const publicPaths = ['/login', '/auth/callback', '/api/leads/ingest', '/api/cron', '/portal/', '/api/portal/', '/proposal/', '/api/proposal/']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
