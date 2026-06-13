"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function PortalLayout({ children }) {
    const pathname = usePathname();
    const { user } = useStore();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Determine the context based on URL
    const isTrainer = pathname.startsWith('/trainer');
    const isGym = pathname.startsWith('/gym');

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

    // Don't render until user is loaded (assuming individual pages also check, but this prevents flashing)
    if (!user) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Portal...</div>;

    // RBAC Logic: Check user's gym roles
    const userRoles = user.gyms?.map(g => g.role) || [];
    const isGymAdmin = userRoles.includes('admin') || userRoles.includes('owner');
    const isTrainerRole = userRoles.includes('trainer');

    let navLinks = [];
    
    if (isTrainerRole && isTrainer) {
        navLinks = [
            { href: '/trainer/dashboard', label: 'Coach Overview', icon: '📊' },
            { href: '/trainer/dashboard/programs', label: 'Programs & Blueprints', icon: '📋' },
            // If they are a trainer in a gym, give them access to the Gym Dashboard
            ...(user.gyms?.length > 0 ? [{ href: '/gym/admin', label: 'Gym Dashboard', icon: '🏢' }] : [])
        ];
    } else if ((isGymAdmin || isTrainerRole) && isGym) {
        navLinks = [
            { href: '/gym/admin', label: 'Gym Hub', icon: '🏢' },
            // Only Admins/Owners see Gym Settings
            ...(isGymAdmin ? [{ href: '/gym/admin/settings', label: 'Gym Settings', icon: '⚙️' }] : []),
            // Give them a way back to Trainer Hub if they are also a trainer
            ...(isTrainerRole ? [{ href: '/trainer/dashboard', label: 'Coach Portal', icon: '👟' }] : [])
        ];
    } else if (pathname === '/claim') {
        navLinks = [
            { href: '/claim', label: 'Claim Gym', icon: '🔑' }
        ];
    }

    return (
        <div className="portal-layout">
            {/* Mobile Header (Hamburger) */}
            <div className="portal-mobile-header" style={{ display: 'none' }}>
                {/* CSS handles this */}
            </div>

            <div className="mobile-topbar" style={{ display: 'none', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="Logo" style={{ width: '28px', height: '28px', flexShrink: 0 }} />
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isTrainer ? 'Coach Portal' : isGym ? 'Gym Portal' : 'Portal'}
                    </div>
                </div>
                <button onClick={toggleSidebar} style={{ fontSize: '1.5rem', background: 'none', border: 'none', color: 'var(--text-main)', padding: '4px', marginLeft: '16px', flexShrink: 0 }}>
                    ☰
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--primary)' }}>
                        Iron Circle B2B
                    </div>
                    {/* Close button for mobile */}
                    <button className="mobile-close" onClick={toggleSidebar} style={{ display: 'none', background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-main)' }}>×</button>
                </div>

                <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
                    {navLinks.map(link => {
                        const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                        return (
                            <Link 
                                key={link.href} 
                                href={link.href}
                                onClick={() => setSidebarOpen(false)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '12px 24px',
                                    color: isActive ? 'var(--primary)' : 'var(--text-main)',
                                    background: isActive ? 'var(--surface-highlight)' : 'transparent',
                                    textDecoration: 'none',
                                    fontWeight: isActive ? 'bold' : 'normal',
                                    borderLeft: isActive ? '4px solid var(--primary)' : '4px solid transparent'
                                }}
                            >
                                <span>{link.icon}</span>
                                <span>{link.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div style={{ padding: '24px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Link href="/profile/settings" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-main)', textDecoration: 'none' }}>
                        <span>👤</span>
                        <span>My Profile & Settings</span>
                    </Link>
                    <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                        <span>←</span>
                        <span>Athlete App</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className="portal-main">
                {children}
            </main>
            
            {/* Overlay for mobile sidebar */}
            {sidebarOpen && (
                <div 
                    onClick={() => setSidebarOpen(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 45
                    }}
                />
            )}
        </div>
    );
}
