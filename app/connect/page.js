"use client";

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import BottomNav from '@/components/BottomNav';
import SocialTab from '@/components/connect/SocialTab';
import ChatTab from '@/components/connect/ChatTab';
import FeedTab from '@/components/connect/FeedTab';
import { useTranslation } from '@/context/TranslationContext';

function ConnectPageContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'circle' | 'chat'

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab === 'chat' || tab === 'circle') {
            setActiveTab(tab);
        }
    }, [searchParams]);

    return (
        <div className="container" style={{ paddingBottom: '100px', minHeight: '100vh' }}>

            {/* Header */}
            <header style={{
                padding: 'calc(16px + env(safe-area-inset-top)) 0 16px',
                position: 'sticky', top: 0, zIndex: 20,
                background: 'var(--background)',
                borderBottom: '1px solid var(--border)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h1 className="text-gradient" style={{ margin: 0 }}>{t('Connect')}</h1>
                </div>



                {/* Main Tabs */}
                <div style={{ display: 'flex', background: 'var(--surface)', padding: '4px', borderRadius: '100px', border: '1px solid var(--border)' }}>
                    <button
                        onClick={() => setActiveTab('feed')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: activeTab === 'feed' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'feed' ? '#000' : 'var(--text-muted)',
                            borderRadius: '100px',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {t('Feed')}
                    </button>
                    <button
                        onClick={() => setActiveTab('circle')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: activeTab === 'circle' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'circle' ? '#000' : 'var(--text-muted)',
                            borderRadius: '100px',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {t('Circle')}
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        style={{
                            flex: 1,
                            padding: '10px',
                            background: activeTab === 'chat' ? 'var(--primary)' : 'transparent',
                            color: activeTab === 'chat' ? '#000' : 'var(--text-muted)',
                            borderRadius: '100px',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {t('Chat')}
                    </button>
                </div>
            </header >

            {/* Content */}
            < div style={{ paddingTop: '20px' }
            }>
                {activeTab === 'feed' && <FeedTab />}
                {activeTab === 'circle' && <SocialTab />}
                {activeTab === 'chat' && <ChatTab />}
            </div >

            <BottomNav />
        </div >
    );
}

export default function ConnectPage() {
    return (
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
            <ConnectPageContent />
        </Suspense>
    );
}
