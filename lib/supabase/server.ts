import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Check if environment is configured
function isEnvConfigured(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
}

// Mock server client for when environment is not configured
const createMockServerClient = () => ({
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        exchangeCodeForSession: async () => ({ data: { session: null, user: null }, error: new Error('Mock mode - no session') }),
        signOut: async () => ({ error: null }),
    },
    from: (table: string) => ({
        select: () => ({
            eq: () => ({
                single: async () => ({ data: null, error: null }),
                limit: () => ({ data: [], error: null }),
            }),
            order: () => ({
                limit: async () => ({ data: [], error: null }),
            }),
            count: async () => ({ count: 0, error: null }),
        }),
        insert: () => ({
            select: () => ({
                single: async () => ({ data: null, error: null }),
            }),
        }),
        update: () => ({
            eq: () => ({
                in: async () => ({ data: null, error: null }),
            }),
        }),
    }),
    _isMock: true,
})

export async function createClient() {
    // Check if environment is configured
    if (!isEnvConfigured()) {
        console.warn('\x1b[33m⚠️  Supabase not configured - using mock server client\x1b[0m')
        return createMockServerClient() as unknown as ReturnType<typeof createServerClient>
    }

    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet: any[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }: any) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // The `setAll` method was called from a Server Component
                        // This can be ignored if you have middleware refreshing sessions
                    }
                },
            },
        }
    )
}

/**
 * Check if client is in mock mode
 */
export function isMockClient(client: unknown): boolean {
    return !!(client && typeof client === 'object' && '_isMock' in client)
}

/**
 * Create admin client with service role key
 * This bypasses RLS for admin operations
 * IMPORTANT: Only use in admin API routes, never expose to client
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // Debug logging for missing keys
    if (!supabaseUrl) console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
    if (!serviceRoleKey) console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Admin client not configured: Missing URL or Service Role Key')
    }

    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
}
