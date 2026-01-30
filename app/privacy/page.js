"use client";
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="container" style={{ paddingBottom: '100px', paddingTop: 'calc(40px + var(--safe-top))' }}>
            <header style={{ marginBottom: '32px' }}>
                <Link href="/profile" style={{ fontSize: '1.5rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← Back</Link>
                <h1 style={{ fontSize: '2rem', marginTop: '16px' }}>Privacy Policy</h1>
            </header>

            <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', lineHeight: '1.6' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>1. Data Collection</h2>
                <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                    We collect your email, name, and workout data to provide the IronCircle service. Ideally, we would collect nothing, but we need to authenticate you and store your impressive lifts.
                </p>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>2. Usage</h2>
                <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                    Your data is used solely to track your progress and show off to your friends. We do not sell your data to third parties because we are not evil.
                </p>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>3. Gym Groups</h2>
                <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                    If you join a Gym Group, other members of that gym may see your public profile and workout summaries. It helps build community and friendly rivalry.
                </p>

                <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>4. Deletion</h2>
                <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>
                    You can request account deletion at any time. We will wipe your data faster than you can say "lightweight baby".
                </p>

                <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                    Last updated: 2026-01-23
                </div>
            </div>
        </div>
    );
}
