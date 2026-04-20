import { createBrowserClient } from '@supabase/ssr'
import { isEnvConfigured } from '../check-env'

// Mock client for when environment is not configured
const mockClient = {
  auth: {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithOAuth: async () => ({ data: { url: null, provider: 'mock' }, error: new Error('Environment not configured - using mock mode') }),
    signOut: async () => ({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
  },
  from: (table: string) => ({
    select: async () => ({ data: [], error: null, count: 0 }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
  }),
  // Flag to indicate mock mode
  _isMock: true,
}

export function createClient() {
  // Check if environment is configured
  if (!isEnvConfigured()) {
    console.warn('\x1b[33m⚠️  Supabase not configured - using mock client\x1b[0m')
    return mockClient as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Check if client is in mock mode
 */
export function isMockClient(client: unknown): boolean {
  return !!(client && typeof client === 'object' && '_isMock' in client)
}
