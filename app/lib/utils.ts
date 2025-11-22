export function getAbsoluteUrl(path: string = '') {
    // 1. Use explicitly configured URL
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return `${process.env.NEXT_PUBLIC_APP_URL}${path}`;
    }

    // 2. Use Vercel URL (automatically set on Vercel)
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
        return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}${path}`;
    }

    // 3. Fallback to window location on client
    if (typeof window !== 'undefined') {
        return `${window.location.origin}${path}`;
    }

    // 4. Fallback to localhost for server-side generation
    return `http://localhost:3000${path}`;
}
