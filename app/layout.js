import './globals.css';
import { StoreProvider } from '@/lib/store';
import Providers from './providers';
import { ToastProvider } from '@/components/ToastProvider';
import UpdateChecker from '@/components/UpdateChecker';
import HardwareBackButton from '@/components/HardwareBackButton';
import { TranslationProvider } from '@/context/TranslationContext';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

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
                    <ToastProvider>
                        <StoreProvider>
                            <TranslationProvider>
                                <GlobalErrorBoundary>
                                    <UpdateChecker />
                                    <HardwareBackButton />
                                    {children}
                                </GlobalErrorBoundary>
                            </TranslationProvider>
                        </StoreProvider>
                    </ToastProvider>
                </Providers>
            </body>
        </html>
    )
}
