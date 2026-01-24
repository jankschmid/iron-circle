import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    // Deine bisherigen Einstellungen...
    experimental: {
        // leaving experimental empty if not needed
    },
    turbopack: {
        root: __dirname,
    },
};

export default nextConfig;
