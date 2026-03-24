import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const mockupsDir = join(process.cwd(), 'public', 'assets', 'mockups');
        const files = await readdir(mockupsDir);

        // Filter for common image extensions
        const validExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        const images = files
            .filter(file => validExtensions.some(ext => file.toLowerCase().endsWith(ext)))
            .map(file => `/assets/mockups/${file}`);

        // Sort them (e.g. mockup_01, mockup_02...)
        images.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        return NextResponse.json({ images });
    } catch (error) {
        console.error('Error scanning mockups directory:', error);
        // Fallback to empty if directory doesn't exist
        return NextResponse.json({ images: [] });
    }
}
