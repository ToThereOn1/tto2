/**
 * Environment Variable Validation Script
 * Checks for required environment variables before app starts
 */

const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

const optionalEnvVars = [
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'OPENAI_API_KEY',
] as const

interface EnvCheckResult {
    isValid: boolean
    missing: string[]
    warnings: string[]
}

export function checkEnvironmentVariables(): EnvCheckResult {
    const missing: string[] = []
    const warnings: string[] = []

    // Check required variables
    for (const envVar of requiredEnvVars) {
        if (!process.env[envVar]) {
            missing.push(envVar)
        }
    }

    // Check optional variables
    for (const envVar of optionalEnvVars) {
        if (!process.env[envVar]) {
            warnings.push(envVar)
        }
    }

    return {
        isValid: missing.length === 0,
        missing,
        warnings,
    }
}

export function validateEnvOrExit(): void {
    const result = checkEnvironmentVariables()

    if (!result.isValid) {
        console.error('\n' + '='.repeat(60))
        console.error('\x1b[31m❌ ENVIRONMENT VALIDATION FAILED\x1b[0m')
        console.error('='.repeat(60))

        for (const key of result.missing) {
            console.error(`\x1b[31m❌ Missing Key: ${key}\x1b[0m`)
        }

        console.error('\nPlease create a .env.local file with the required variables.')
        console.error('See .env.local.example for reference.\n')

        // Exit with error code
        process.exit(1)
    }

    // Log warnings for optional variables
    if (result.warnings.length > 0) {
        console.warn('\n' + '-'.repeat(60))
        console.warn('\x1b[33m⚠️  Optional environment variables not set:\x1b[0m')
        for (const key of result.warnings) {
            console.warn(`\x1b[33m   - ${key}\x1b[0m`)
        }
        console.warn('-'.repeat(60) + '\n')
    }

    console.log('\x1b[32m✅ Environment validation passed\x1b[0m\n')
}

/**
 * Check if environment is configured (for client-side use)
 */
export function isEnvConfigured(): boolean {
    return !!(
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
}

/**
 * Get environment status for display
 */
export function getEnvStatus(): {
    configured: boolean
    supabaseUrl: boolean
    supabaseKey: boolean
} {
    return {
        configured: isEnvConfigured(),
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    }
}
