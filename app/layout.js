import './globals.css'
import { StoreProvider } from '@/lib/store';

export const metadata = {
    title: 'IronCircle',
    description: 'Social Performance Tracking for Athletes',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="antialiased">
                <StoreProvider>
                    {children}
                </StoreProvider>
            </body>
        </html>
    )
}
