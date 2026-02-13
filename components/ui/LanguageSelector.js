"use client";

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/context/TranslationContext';

export default function LanguageSelector({ position = 'bottom-right' }) {
    const { language, changeLanguage, supportedLanguages } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentLang = supportedLanguages?.find(l => l.code === language) || supportedLanguages?.[0];

    return (
        <div ref={containerRef} style={{ position: 'relative', zIndex: 50 }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'rgba(24, 24, 27, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    color: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backdropFilter: 'blur(10px)'
                }}
            >
                <span style={{ fontSize: '1.2rem' }}>{currentLang?.flag}</span>
                <span>{currentLang?.label}</span>
                <span style={{ fontSize: '0.7rem', opacity: 0.5 }}>▼</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: position.includes('top') ? 'auto' : '110%',
                    bottom: position.includes('top') ? '110%' : 'auto',
                    right: position.includes('right') ? 0 : 'auto',
                    left: position.includes('left') ? 0 : 'auto',
                    background: '#18181b', // Zinc-900
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    minWidth: '140px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
                }}>
                    {supportedLanguages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                changeLanguage(lang.code);
                                setIsOpen(false);
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                border: 'none',
                                background: language === lang.code ? 'var(--brand-yellow, #faff00)' : 'transparent',
                                color: language === lang.code ? '#000' : '#a1a1aa',
                                fontSize: '0.9rem',
                                fontWeight: language === lang.code ? 'bold' : 'normal',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.1s'
                            }}
                            onMouseEnter={(e) => {
                                if (language !== lang.code) {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                    e.currentTarget.style.color = '#fff';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (language !== lang.code) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#a1a1aa';
                                }
                            }}
                        >
                            <span style={{ fontSize: '1.2rem' }}>{lang.flag}</span>
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
