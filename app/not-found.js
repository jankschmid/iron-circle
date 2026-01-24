"use client";

import Link from 'next/link';
import BottomNav from '@/components/BottomNav';

export default function NotFound() {
    return (
        <div className="container" style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            paddingBottom: '100px'
        }}>
            <h1 style={{ fontSize: '4rem', marginBottom: '16px' }}>404</h1>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Page Not Found</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                Oops! The page you're looking for doesn't exist.
            </p>

            <Link href="/" style={{
                background: 'var(--primary)',
                color: '#000',
                padding: '12px 24px',
                borderRadius: '100px',
                fontWeight: '700',
                textDecoration: 'none'
            }}>
                Go Home
            </Link>

            <BottomNav />
        </div>
    );
}
