"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function TranslationsAdminPage() {
    const [keys, setKeys] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedLang, setSelectedLang] = useState('de'); // Default DE
    const [filterMissing, setFilterMissing] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [categories, setCategories] = useState([]);

    // Language Form
    const [newLangCode, setNewLangCode] = useState('');
    const [newLangLabel, setNewLangLabel] = useState('');
    const [newLangFlag, setNewLangFlag] = useState('');
    const [languages, setLanguages] = useState([]);
    const [showLangModal, setShowLangModal] = useState(false);

    // AI State
    const [autoTranslating, setAutoTranslating] = useState(false);
    const [message, setMessage] = useState(null);

    const supabase = createClient();
    const router = useRouter();

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('app_translations')
                .select('*')
                .order('key');

            if (data) {
                // De-dupe client side just in case
                const unique = [];
                const seen = new Set();
                data.forEach(d => {
                    if (!seen.has(d.key)) {
                        seen.add(d.key);
                        unique.push(d);
                    }
                });
                setKeys(unique);

                // Extract unique categories
                const cats = new Set();
                unique.forEach(k => {
                    if (k.flags?.category) cats.add(k.flags.category);
                });
                setCategories(Array.from(cats).sort());
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchLanguages = async () => {
        const { data } = await supabase.from('app_languages').select('*').order('code');
        if (data) setLanguages(data);
    };

    useEffect(() => {
        fetchKeys();
        fetchLanguages();
    }, []);

    const handleSave = async (id, lang, value) => {
        // Optimistic Update
        setKeys(prev => prev.map(k => {
            if (k.id === id) {
                return { ...k, translations: { ...k.translations, [lang]: value } };
            }
            return k;
        }));

        // DB Update
        const keyRow = keys.find(k => k.id === id);
        if (!keyRow) return;

        const updatedTranslations = { ...keyRow.translations, [lang]: value };

        await supabase
            .from('app_translations')
            .update({ translations: updatedTranslations })
            .eq('id', id);
    };

    const handleAutoTranslate = async () => {
        // TEMPORARY FIX FOR ANDROID STATIC EXPORT:
        // API Routes cannot be used with output: 'export'.
        // We need to move this logic to Supabase Edge Functions.
        alert("Auto-translation is temporarily disabled for the Android Build (Static Export compatibility). Please use the Vercel dashboard version for admin tasks or wait for the Supabase Edge Function update.");
        return;
    };

    const handleAddLanguage = async () => {
        if (!newLangCode || !newLangLabel) return;

        const { error } = await supabase.from('app_languages').insert({
            code: newLangCode.toLowerCase(),
            label: newLangLabel,
            flag: newLangFlag || '🏳️'
        });

        if (!error) {
            setNewLangCode('');
            setNewLangLabel('');
            setNewLangFlag('');
            setShowLangModal(false);
            fetchLanguages();
        } else {
            alert('Error adding language: ' + error.message);
        }
    };

    // Filter Logic
    const filteredKeys = keys.filter(k => {
        const matchesSearch = k.key.toLowerCase().includes(search.toLowerCase()) ||
            (k.translations?.[selectedLang] && k.translations[selectedLang].toLowerCase().includes(search.toLowerCase()));

        const isMissing = !k.translations?.[selectedLang];
        const categoriesMatch = selectedCategory === 'All' || k.flags?.category === selectedCategory;

        if (filterMissing && !isMissing) return false;
        if (!categoriesMatch) return false;

        return matchesSearch;
    });

    const completionPercent = keys.length > 0
        ? Math.round((keys.filter(k => k.translations?.[selectedLang]).length / keys.length) * 100)
        : 0;

    return (
        <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e0e0e0', padding: '20px', paddingBottom: '100px', fontFamily: 'Inter, sans-serif' }}>

            {/* ALERT TOAST */}
            {message && (
                <div style={{
                    position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
                    background: message.type === 'error' ? 'rgba(255, 50, 50, 0.9)' : (message.type === 'success' ? 'rgba(50, 200, 100, 0.9)' : 'rgba(50, 100, 255, 0.9)'),
                    padding: '12px 24px', borderRadius: '12px', zIndex: 9999, fontWeight: 'bold', color: '#fff',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)', cursor: 'pointer'
                }} onClick={() => setMessage(null)}>
                    {message.text}
                </div>
            )}

            {/* HEADER */}
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #333', paddingBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', margin: 0, letterSpacing: '-1px' }}>
                            TRANSLATION <span style={{ color: 'var(--primary, #00d2ff)' }}>CONTROLLER</span>
                        </h1>
                        <p style={{ color: '#666', marginTop: '8px', fontSize: '1rem' }}>Manage global content & localization</p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        {/* AUTO TRANSLATE BUTTON */}
                        <button
                            onClick={handleAutoTranslate}
                            disabled={autoTranslating}
                            style={{
                                background: autoTranslating ? '#333' : 'linear-gradient(45deg, #00C2FF, #005f7a)',
                                border: 'none',
                                padding: '12px 24px',
                                borderRadius: '12px',
                                color: '#fff',
                                fontWeight: 'bold',
                                cursor: autoTranslating ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                boxShadow: autoTranslating ? 'none' : '0 0 20px rgba(0, 194, 255, 0.3)',
                                transition: 'all 0.2s'
                            }}
                        >
                            {autoTranslating ? <span className="spinner"></span> : '✨'}
                            {autoTranslating ? 'DeepL Working...' : 'Auto-Fill (DeepL)'}
                        </button>

                        <button
                            onClick={() => setShowLangModal(true)}
                            style={{ background: '#222', border: '1px solid #333', color: '#fff', width: '44px', height: '44px', borderRadius: '12px', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            +
                        </button>

                        {/* Language Modal */}
                        {showLangModal && (
                            <div style={{
                                position: 'absolute', top: '100px', right: '20px', background: '#1a1a1a', padding: '24px', borderRadius: '16px',
                                border: '1px solid #444', zIndex: 100, display: 'flex', flexDirection: 'column', gap: '12px', width: '300px',
                                boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                            }}>
                                <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Add Language</h3>
                                <input style={{ padding: '12px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} placeholder="Code (e.g. es)" value={newLangCode} onChange={e => setNewLangCode(e.target.value)} />
                                <input style={{ padding: '12px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} placeholder="Label (e.g. Spanish)" value={newLangLabel} onChange={e => setNewLangLabel(e.target.value)} />
                                <input style={{ padding: '12px', background: '#111', border: '1px solid #333', borderRadius: '8px', color: '#fff' }} placeholder="Flag Emoji" value={newLangFlag} onChange={e => setNewLangFlag(e.target.value)} />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                    <button onClick={handleAddLanguage} style={{ flex: 1, padding: '12px', background: 'var(--brand-yellow, #FFC800)', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 'bold', cursor: 'pointer' }}>Add</button>
                                    <button onClick={() => setShowLangModal(false)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid #444', borderRadius: '8px', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        <div style={{ background: '#1a1a1a', padding: '8px 16px', borderRadius: '12px', border: '1px solid #333' }}>
                            <span style={{ color: '#888', fontSize: '0.8rem', display: 'block' }}>Target Language</span>
                            <select
                                value={selectedLang}
                                onChange={(e) => setSelectedLang(e.target.value)}
                                style={{
                                    background: '#1a1a1a',
                                    border: 'none',
                                    color: '#fff',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    cursor: 'pointer',
                                    outline: 'none',
                                    width: '100%'
                                }}
                            >
                                {languages.map(l => (
                                    <option key={l.code} value={l.code} style={{ background: '#333', color: '#fff' }}>
                                        {l.flag} {l.label} ({l.code.toUpperCase()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* CONTROLS BAR */}
                <div style={{
                    display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '24px',
                    background: '#111', padding: '16px', borderRadius: '16px', border: '1px solid #222'
                }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.2rem' }}>🔍</span>
                        <input
                            type="text"
                            placeholder="Search keys or translations..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 12px 12px 48px',
                                background: '#222', border: '1px solid #333', borderRadius: '8px',
                                color: '#fff', fontSize: '1rem', outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        onClick={() => setFilterMissing(!filterMissing)}
                        style={{
                            background: filterMissing ? 'var(--brand-yellow, #FFC800)' : '#222',
                            color: filterMissing ? '#000' : '#888',
                            border: '1px solid #333', padding: '12px 24px', borderRadius: '8px',
                            cursor: 'pointer', fontWeight: 'bold'
                        }}
                    >
                        {filterMissing ? 'Show All' : 'Show Missing Only'}
                    </button>

                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        style={{
                            background: '#222', color: '#fff', border: '1px solid #333',
                            padding: '12px', borderRadius: '8px', outline: 'none', cursor: 'pointer',
                            maxWidth: '200px'
                        }}
                    >
                        <option value="All">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: '150px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px', color: '#888' }}>
                            <span>Progress ({selectedLang.toUpperCase()})</span>
                            <span>{completionPercent}%</span>
                        </div>
                        <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${completionPercent}%`, background: 'var(--success, #00FF94)', height: '100%' }} />
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div style={{ background: '#111', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden' }}>

                    {/* TABLE HEAD */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', background: '#1a1a1a', borderBottom: '1px solid #333', padding: '16px 24px' }}>
                        <div style={{ fontWeight: 'bold', color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Key (English)</div>
                        <div style={{ fontWeight: 'bold', color: '#888', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>Translation ({selectedLang.toUpperCase()})</div>
                    </div>

                    {/* TABLE BODY */}
                    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>Loading dictionary...</div>
                        ) : filteredKeys.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>No keys found matching your filter.</div>
                        ) : (
                            Object.entries(filteredKeys.reduce((acc, k) => {
                                const cat = k.flags?.category || 'Uncategorized';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(k);
                                return acc;
                            }, {})).sort((a, b) => a[0].localeCompare(b[0])).map(([category, keys]) => (
                                <div key={category}>
                                    <div style={{
                                        position: 'sticky', top: 0, zIndex: 10,
                                        background: '#222', color: 'var(--primary, #00d2ff)',
                                        padding: '8px 24px', fontSize: '0.8rem', fontWeight: 'bold',
                                        textTransform: 'uppercase', letterSpacing: '1px',
                                        borderBottom: '1px solid #333', borderTop: '1px solid #333'
                                    }}>
                                        {category} ({keys.length})
                                    </div>
                                    {keys.map(k => (
                                        <div key={k.id} style={{
                                            display: 'grid', gridTemplateColumns: '1fr 1fr',
                                            borderBottom: '1px solid #222',
                                            transition: 'background 0.2s'
                                        }} className="row-hover">
                                            <div style={{ padding: '16px 24px', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                                <span style={{ fontFamily: 'monospace', color: '#ccc', fontSize: '0.9rem', marginBottom: '4px' }}>{k.key}</span>
                                            </div>
                                            <div style={{ padding: '8px 16px' }}>
                                                <div style={{ position: 'relative', width: '100%' }}>
                                                    <input
                                                        type="text"
                                                        value={k.translations?.[selectedLang] || ''}
                                                        onChange={(e) => handleSave(k.id, selectedLang, e.target.value)}
                                                        placeholder={`Enter ${selectedLang.toUpperCase()} translation...`}
                                                        style={{
                                                            width: '100%', padding: '12px',
                                                            paddingRight: k.flags?.[selectedLang] === 'auto' ? '30px' : '12px',
                                                            background: k.translations?.[selectedLang] ? 'transparent' : 'rgba(255, 200, 0, 0.05)',
                                                            border: k.translations?.[selectedLang] ? '1px solid transparent' : '1px dashed #444',
                                                            borderRadius: '8px',
                                                            color: k.translations?.[selectedLang] ? '#fff' : '#FFC800',
                                                            outline: 'none',
                                                            fontSize: '0.95rem'
                                                        }}
                                                        onFocus={(e) => e.target.style.background = '#000'}
                                                        onBlur={(e) => e.target.style.background = k.translations?.[selectedLang] ? 'transparent' : 'rgba(255, 200, 0, 0.05)'}
                                                    />
                                                    {k.flags?.[selectedLang] === 'auto' && (
                                                        <span
                                                            title="Auto-translated by DeepL"
                                                            style={{
                                                                position: 'absolute',
                                                                right: '10px',
                                                                top: '50%',
                                                                transform: 'translateY(-50%)',
                                                                fontSize: '0.9rem',
                                                                pointerEvents: 'none',
                                                                filter: 'grayscale(100%) opacity(0.7)'
                                                            }}
                                                        >
                                                            ✨
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                .spinner {
                    width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; borderRadius: 50%; animation: spin 1s linear infinite; display: inline-block;
                }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .row-hover:hover { background: #1a1a1a; }
            `}</style>
        </div>
    );
}
