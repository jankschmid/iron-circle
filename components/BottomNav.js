"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useStore } from '@/lib/store';

export default function BottomNav() {
    const pathname = usePathname();
    const { user, unreadCount } = useStore();

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
                    gap: '4px',
                    position: 'relative' // Position relative for badge
                }}>
                    <span style={{ fontSize: '1.2rem', position: 'relative' }}>
                        {item.icon}
                        {item.path === '/connect' && unreadCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-4px',
                                right: '-8px',
                                background: 'var(--error)',
                                color: 'white',
                                fontSize: '0.6rem',
                                fontWeight: 'bold',
                                minWidth: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid var(--surface)'
                            }}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </span>
                    <span>{item.label}</span>
                </Link>
            ))}
        </nav>
    );
}
