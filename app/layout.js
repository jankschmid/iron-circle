import './globals.css'
import { StoreProvider } from '@/lib/store';
import Providers from './providers';
import UpdateChecker from '@/components/UpdateChecker';
import HardwareBackButton from '@/components/HardwareBackButton';

export const metadata = {
    title: 'IronCircle',
    description: 'Social Performance Tracking for Athletes',
}

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="antialiased" suppressHydrationWarning>
                <Providers>
                    <StoreProvider>
                        <UpdateChecker />
                        <HardwareBackButton />
                        {children}
                    </StoreProvider>
                </Providers>
            </body>
        </html>
    )
}
