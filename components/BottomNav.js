"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useStore } from '@/lib/store';

export default function BottomNav() {
    const pathname = usePathname();
    const { user } = useStore();

    const isActive = (path) => {
        if (path === '/' && pathname === '/') return true;
        // Handle query params in checking active state? tough.
        // Just check prefix.
        if (path.startsWith('/community') && pathname.startsWith('/community')) return true;
        if (path !== '/' && pathname.startsWith(path)) return true;
        return false;
    };

    const navItems = [
        { path: '/', label: 'Home', icon: '🏠' },
        { path: '/workout', label: 'Workout', icon: '💪' },
        ...(user?.gymId ? [{ path: `/community?gymId=${user.gymId}`, label: 'Gym', icon: '🏟️' }] : []),
        { path: '/connect', label: 'Connect', icon: '🌍' },
        { path: '/profile', label: 'Me', icon: '👤' },
    ];

    return (
        <nav style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            width: '100%',
            background: 'var(--surface)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-around',
            paddingTop: '12px',
            paddingBottom: 'calc(12px + var(--safe-bottom))',
            zIndex: 100
        }}>
            {navItems.map(item => (
                <Link key={item.path} href={item.path} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textDecoration: 'none',
                    color: isActive(item.path) ? 'var(--primary)' : 'var(--text-muted)',
                    fontSize: '0.75rem',
                    gap: '4px'
                }}>
                    <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                    <span>{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}
