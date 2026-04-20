import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet: any[]) {
                    cookiesToSet.forEach(({ name, value }: any) => request.cookies.set(name, value))
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }: any) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session if expired
    const { data: { user } } = await supabase.auth.getUser()

    // CSRF protection: reject state-changing requests from unexpected origins
    const method = request.method
    const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
    const isStateChanging = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
    const hasBearerAuth = request.headers.get('authorization')?.startsWith('Bearer ')

    if (isApiRoute && isStateChanging && !hasBearerAuth) {
        const origin = request.headers.get('origin')
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        if (origin && appUrl && !origin.startsWith(appUrl)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
    }

    // Protected routes
    const protectedPaths = ['/dashboard', '/mailbox', '/settings']
    const isProtectedPath = protectedPaths.some(path =>
        request.nextUrl.pathname.startsWith(path)
    )

    // Admin routes
    const isAdminPath = request.nextUrl.pathname.startsWith('/admin')

    // Redirect to login if accessing protected route without auth
    if ((isProtectedPath || isAdminPath) && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        url.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(url)
    }

    // Admin Security Check
    if (isAdminPath && user) {
        // Check if user is in admin_users table
        const { data: adminUser, error } = await supabase
            .from('admin_users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (error || !adminUser) {
            console.error(`[Admin Access Denied] User: ${user.id}, Error:`, error)
            const url = request.nextUrl.clone()
            url.pathname = '/dashboard' // Kick out to dashboard
            return NextResponse.redirect(url)
        } else {
            console.log(`[Admin Access Granted] User: ${user.id}, Role: ${adminUser.role}`)
        }
    }

    // Redirect to dashboard if accessing auth pages while logged in
    const authPaths = ['/login', '/signup']
    const isAuthPath = authPaths.some(path =>
        request.nextUrl.pathname === path
    )

    if (isAuthPath && user) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|monitoring|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
