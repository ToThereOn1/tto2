declare module '@supabase/ssr' {
    export function createBrowserClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
    export function createServerClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
}
