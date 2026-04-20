/**
 * Fetch utilities with timeout support
 * Prevents infinite loading by enforcing hard timeouts
 */

export class TimeoutError extends Error {
    constructor(message: string = 'Request timed out') {
        super(message)
        this.name = 'TimeoutError'
    }
}

export class GatewayTimeoutError extends Error {
    constructor(service: string = 'external service') {
        super(`Gateway Timeout: ${service} did not respond within the allowed time`)
        this.name = 'GatewayTimeoutError'
    }
}

/**
 * Create an AbortSignal that times out after specified milliseconds
 */
export function createTimeoutSignal(timeoutMs: number): AbortSignal {
    return AbortSignal.timeout(timeoutMs)
}

/**
 * Wrap any promise with a timeout
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms = 10s)
 * @param serviceName - Name of the service for error messages
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number = 10000,
    serviceName: string = 'Service'
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            reject(new GatewayTimeoutError(serviceName))
        }, timeoutMs)
    })

    return Promise.race([promise, timeoutPromise])
}

/**
 * Fetch with timeout wrapper
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeoutMs - Timeout in milliseconds (default: 10000ms)
 */
export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 10000
): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        return response
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new TimeoutError(`Request to ${url} timed out after ${timeoutMs}ms`)
        }
        throw error
    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * Default timeout values for different services
 */
export const TIMEOUTS = {
    SUPABASE: 5000,      // 5 seconds for DB operations
    SUPABASE_AUTH: 8000, // 8 seconds for auth operations
    LLM_API: 30000,      // 30 seconds for LLM (they can be slow)
    DEFAULT: 10000,      // 10 seconds default
} as const
