import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: false, // Fix double-mount AbortErrors in local dev
    // output: 'export', // Uncomment for Capacitor Android build
    images: {
        unoptimized: true
    },
    experimental: {
        // leaving experimental empty if not needed
    },
};

export default nextConfig;
