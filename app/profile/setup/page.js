"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';
import AvatarEditor from '@/components/AvatarEditor';

export default function OnboardingWizard() {
    const { user, updateUserProfile, saveUserGym } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const { success, error: toastError } = useToast();

    // WIZARD STATE
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);

    // DATA STATE
    const [formData, setFormData] = useState({
        username: '',
        name: '',
        avatar: '',
        gender: '',
        height: '',
        weight: '',
        goal: 'Muscle', // Default
        gymMode: 'search', // 'search', 'create', 'code'
        gymSearch: '',
        gymCode: '',
        selectedGymId: null
    });

    // AVATAR PRESETS
    const DEFAULT_AVATARS = [
        'Felix', 'Aneka', 'Zoe', 'Jack', 'Milo', 'Bella',
        'Leo', 'Lilly', 'Max', 'Sam', 'Nala', 'Kai'
    ];

    const [avatarOptions, setAvatarOptions] = useState(DEFAULT_AVATARS.map(seed => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`));

    const shuffleAvatars = () => {
        const randomSeeds = Array.from({ length: 12 }, () => Math.random().toString(36).substring(7));
        setAvatarOptions(randomSeeds.map(seed => `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`));
    };

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                username: user.handle?.replace('@', '') || '',
                name: user.name || '',
                avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            }));
        }
    }, [user]);

    // HANDLERS
    const updateField = (key, val) => setFormData(prev => ({ ...prev, [key]: val }));

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    // STEP 1: IDENTITY
    const validateStep1 = async () => {
        if (!formData.username || formData.username.length < 3) return toastError("Username too short");

        // Strict Validation: Alphanumeric Only
        const usernameRegex = /^[a-zA-Z0-9]+$/;
        if (!usernameRegex.test(formData.username)) {
            return toastError("Username can only contain letters and numbers (no spaces or symbols).");
        }

        setLoading(true);
        try {
            // Check availability
            if (user && formData.username !== user.handle?.replace('@', '')) {
                const { data: existing, error } = await supabase.from('profiles').select('id').eq('username', formData.username).maybeSingle();
                if (error) throw error;

                if (existing && existing.id !== user.id) {
                    toastError("Username taken");
                    return; // Stop here, finally will run
                }
            }
            nextStep();
        } catch (err) {
            console.error(err);
            toastError("Error checking username");
        } finally {
            setLoading(false);
        }
    };

    // STEP 2: BODY STATS
    const validateStep2 = () => {
        if (!formData.gender) return toastError("Please select a gender");
        if (!formData.weight) return toastError("Please enter weight");
        if (!formData.height) return toastError("Please enter height");
        nextStep();
    };

    // STEP 3: GYM & FINISH
    const handleSkip = () => {
        // Clear gym selection to prevent accidental join/create
        setFormData(prev => ({
            ...prev,
            gymMode: 'search',
            selectedGymId: null,
            gymCode: '',
            gymSearch: ''
        }));
        nextStep();
    };

    const handleFinish = async () => {
        setLoading(true);

        const operationsPromise = async () => {
            // 1. Update Profile (Identity + Stats + Privacy)
            console.log("Finalizing: 1. Upserting Profile...");

            // Sanitize username to satisfy 'username_alphanumeric' constraint
            // (In case user got past validation with dirty state)
            let cleanUsername = formData.username.replace(/[^a-zA-Z0-9]/g, '');

            if (!cleanUsername) {
                // Fallback: 'u' + last 8 digits of timestamp (Total ~9 chars)
                cleanUsername = 'u' + Date.now().toString().slice(-8);
            }

            // TRUNCATE: Max 15 chars (DB Constraint)
            cleanUsername = cleanUsername.slice(0, 15);

            if (cleanUsername.length < 3) {
                // Pad with random numbers if too short after cleaning (e.g. "Al" -> "Al7")
                cleanUsername += Math.floor(Math.random() * 10).toString();
            }

            const { error: pError } = await supabase.from('profiles').upsert({
                id: user.id,
                username: cleanUsername,
                name: formData.name,
                avatar_url: formData.avatar,
                gender: formData.gender,
                height: parseFloat(formData.height),
                weight: parseFloat(formData.weight),
                bio: '', // Bio is optional, goal is separate now
                goal: formData.goal,
                privacy_settings: {
                    profile_visibility: formData.profileVisibility,
                    live_status: !formData.ghostMode,
                    gym_monitor_streaming: !formData.ghostMode
                },
                updated_at: new Date()
            });

            if (pError) throw pError;

            // 2. Handle Gym
            console.log("Finalizing: 2. Handling Gym...");
            if (formData.gymMode === 'code') {
                // Join with Code
                // IDEMPOTENCY: If already joined, treating as success
                const { data: res, error: rpcError } = await supabase.rpc('join_gym_with_code', { p_code: formData.gymCode });

                if (rpcError) {
                    // Check for conflict/duplicate (already joined)
                    if (rpcError.code === '23505' || rpcError.code === 'P0001' || rpcError.message?.includes('already')) {
                        console.warn("Gym join conflict (already member?) - proceeding anyway");
                        success(`Joined Gym!`);
                    } else {
                        throw rpcError;
                    }
                } else {
                    if (!res.success) throw new Error(res.message);
                    success(`Joined ${res.gym_name} as ${res.role}!`);
                }
            }
            else if (formData.gymMode === 'create') {
                // Create New Gym
                const gymName = formData.gymSearch;
                await saveUserGym(gymName, 0, 0, 'My Gym', null, 'wizard');
            }
            else if (formData.gymMode === 'search' && formData.selectedGymId) {
                // Join existing
                const { error: gymError } = await supabase.from('user_gyms').insert({
                    user_id: user.id,
                    gym_id: formData.selectedGymId,
                    label: formData.selectedGymName || 'Main Gym', // Use actual name
                    is_default: true,
                    role: 'member'
                });
                if (gymError && gymError.code !== '23505') throw gymError;
            }

            // Sync Store
            console.log("Finalizing: 3. Syncing Store...");
            updateUserProfile({
                handle: '@' + formData.username,
                name: formData.name,
                avatar: formData.avatar,
                level: user.level,
                height: parseFloat(formData.height), // Critical for Onboarding Check
                weight: parseFloat(formData.weight)
            });
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Finalizing timeout")), 15000)
        );

        try {
            await Promise.race([operationsPromise(), timeoutPromise]);
            // Success redirect
            window.location.href = '/';

        } catch (err) {
            console.error("Finalizing Error Details:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            if (err.message === "Finalizing timeout") {
                console.warn("Finalizing timed out - forcing redirect");
                success("Setup completed (background sync in progress)");
                window.location.href = '/';
            } else {
                toastError("Error: " + err.message);
                setLoading(false); // Only stop loading on real error, otherwise we redirect
            }
        }
    };

    // SEARCH GYMS
    const [gymResults, setGymResults] = useState([]);
    useEffect(() => {
        if (formData.gymMode === 'search' && formData.gymSearch.length > 2) {
            const timer = setTimeout(async () => {
                const { data } = await supabase.from('gyms').select('id, name, address').ilike('name', `%${formData.gymSearch}%`).limit(5);
                setGymResults(data || []);
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setGymResults([]);
        }
    }, [formData.gymSearch, formData.gymMode]);


    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
            <div style={{ width: '100%', maxWidth: '500px', background: 'var(--surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)' }}>
                {/* Progress Bar */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ flex: 1, height: '4px', background: i <= step ? 'var(--primary)' : 'var(--border)', borderRadius: '2px', transition: '0.3s' }} />
                    ))}
                </div>

                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Who are you?</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Choose your identity in the IronCircle.</p>

                        <div style={{ marginBottom: '24px', textAlign: 'center' }}>
                            {formData.avatar ? (
                                <img src={formData.avatar} style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '16px', border: '3px solid var(--primary)' }} />
                            ) : (
                                <div style={{ width: '100px', height: '100px', borderRadius: '50%', marginBottom: '16px', border: '3px dashed var(--border)', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                    ?
                                </div>
                            )}

                            {/* Avatar Grid */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Pick one or...</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setShowAvatarEditor(true)} style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '100px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--primary)' }}>
                                        ✏️ Customize
                                    </button>
                                    <button onClick={shuffleAvatars} style={{ fontSize: '0.8rem', padding: '6px 12px', borderRadius: '100px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--primary)' }}>
                                        🎲 Shuffle
                                    </button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
                                {avatarOptions.map((url, i) => (
                                    <img
                                        key={i}
                                        src={url}
                                        onClick={() => updateField('avatar', url)}
                                        style={{
                                            width: '100%', aspectRatio: '1/1', borderRadius: '50%', cursor: 'pointer',
                                            border: formData.avatar === url ? '2px solid var(--primary)' : '2px solid transparent',
                                            opacity: formData.avatar === url ? 1 : 0.6
                                        }}
                                    />
                                ))}
                            </div>

                            {/* EDITOR MODAL */}
                            {showAvatarEditor && (
                                <AvatarEditor
                                    initialUrl={formData.avatar}
                                    onSave={(url) => {
                                        updateField('avatar', url);
                                        setShowAvatarEditor(false);
                                    }}
                                    onCancel={() => setShowAvatarEditor(false)}
                                />
                            )}
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Username</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => updateField('username', e.target.value.trim())}
                                placeholder="ironwolf"
                                style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white' }}
                            />
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Display Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                placeholder="John Doe"
                                style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white' }}
                            />
                        </div>

                        <button onClick={validateStep1} disabled={loading} className="w-full btn-primary" style={{ padding: '16px', width: '100%', background: 'var(--primary)', border: 'none', borderRadius: '100px', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', color: 'black' }}>
                            {loading ? 'Checking...' : 'Next: Body Stats →'}
                        </button>
                    </div>
                )}

                {/* STEP 2: BODY STATS */}
                {step === 2 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Your Stats</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Help us calibrate the algorithm.</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                            {['Male', 'Female', 'Divers', 'n/a'].map(g => (
                                <button
                                    key={g}
                                    onClick={() => updateField('gender', g)}
                                    style={{
                                        padding: '16px', borderRadius: '12px', border: '1px solid var(--border)',
                                        background: formData.gender === g ? 'var(--primary)' : 'var(--background)',
                                        color: formData.gender === g ? 'black' : 'white',
                                        fontWeight: 'bold', cursor: 'pointer'
                                    }}
                                >
                                    {g === 'n/a' ? 'Prefer not to say' : g}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Height (cm)</label>
                                <input type="number" value={formData.height} onChange={(e) => updateField('height', e.target.value)} placeholder="180" style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Weight (kg)</label>
                                <input type="number" value={formData.weight} onChange={(e) => updateField('weight', e.target.value)} placeholder="80" style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white' }} />
                            </div>
                        </div>

                        <div style={{ marginBottom: '32px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Main Goal</label>
                            <select
                                value={formData.goal}
                                onChange={(e) => updateField('goal', e.target.value)}
                                style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white' }}
                            >
                                <option value="Muscle">Build Muscle</option>
                                <option value="Strength">Gain Strength</option>
                                <option value="Endurance">Endurance</option>
                                <option value="Weight Loss">Weight Loss</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '16px' }}>
                            <button onClick={prevStep} style={{ padding: '16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '100px', fontWeight: 'bold', color: 'var(--text-muted)', cursor: 'pointer' }}>Back</button>
                            <button onClick={validateStep2} style={{ flex: 1, padding: '16px', background: 'var(--primary)', border: 'none', borderRadius: '100px', fontWeight: 'bold', color: 'black', fontSize: '1.1rem', cursor: 'pointer' }}>Next: Gym →</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: GYM ACCESS */}
                {step === 3 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Find your Gym</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>Join a community or start your own.</p>

                        {/* Tabs */}
                        <div style={{ display: 'flex', background: 'var(--background)', padding: '4px', borderRadius: '100px', marginBottom: '24px' }}>
                            <button onClick={() => updateField('gymMode', 'search')} style={{ flex: 1, padding: '10px', borderRadius: '100px', background: formData.gymMode === 'search' ? 'var(--surface)' : 'transparent', color: formData.gymMode === 'search' ? 'white' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Search</button>
                            <button onClick={() => updateField('gymMode', 'create')} style={{ flex: 1, padding: '10px', borderRadius: '100px', background: formData.gymMode === 'create' ? 'var(--surface)' : 'transparent', color: formData.gymMode === 'create' ? 'white' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Create</button>
                            <button onClick={() => updateField('gymMode', 'code')} style={{ flex: 1, padding: '10px', borderRadius: '100px', background: formData.gymMode === 'code' ? 'var(--surface)' : 'transparent', color: formData.gymMode === 'code' ? 'white' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Staff Code</button>
                        </div>

                        {/* Search Mode */}
                        {formData.gymMode === 'search' && (
                            <div>
                                <input
                                    type="text"
                                    placeholder="🔍 Search by Name or City..."
                                    value={formData.gymSearch}
                                    onChange={(e) => updateField('gymSearch', e.target.value)}
                                    autoFocus
                                    style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', marginBottom: '16px' }}
                                />
                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                    {gymResults.map(g => (
                                        <div
                                            key={g.id}
                                            onClick={() => setFormData(prev => ({
                                                ...prev,
                                                selectedGymId: g.id,
                                                selectedGymVerified: g.is_verified,
                                                selectedGymName: g.name // Store name for label
                                            }))}
                                            style={{
                                                padding: '12px', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                                background: formData.selectedGymId === g.id ? 'var(--primary-dim)' : 'transparent',
                                                border: formData.selectedGymId === g.id ? '1px solid var(--primary)' : '1px solid transparent',
                                                borderRadius: '8px',
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                            }}
                                        >
                                            <div>
                                                <div style={{ fontWeight: 'bold', color: formData.selectedGymId === g.id ? 'var(--primary)' : 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    {g.name}
                                                    {g.is_verified && <span title="Verified Partner" style={{ fontSize: '0.8rem' }}>✅</span>}
                                                </div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.address || 'No address provided'}</div>
                                            </div>
                                            {g.is_verified && <span style={{ fontSize: '0.7rem', background: '#FFC800', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PARTNER</span>}
                                        </div>
                                    ))}
                                    {gymResults.length === 0 && formData.gymSearch.length > 2 && (
                                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No gyms found matching "{formData.gymSearch}".</div>
                                    )}
                                    {gymResults.length === 0 && formData.gymSearch.length <= 2 && (
                                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px', fontSize: '0.9rem' }}>Type at least 3 characters to search.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Verified Warning */}
                        {formData.gymMode === 'search' && formData.selectedGymVerified && (
                            <div className="animate-in fade-in zoom-in duration-300" style={{ marginTop: '16px', padding: '16px', background: 'rgba(255, 200, 0, 0.1)', border: '1px solid #FFC800', borderRadius: '12px' }}>
                                <h3 style={{ color: '#FFC800', fontSize: '1rem', marginBottom: '8px' }}>⚠️ Privacy Notice</h3>
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    You are joining a <b>Verified Partner Gym</b>. Your workout activity (Name, Exercise, Weight) will be visible to Gym Staff and on Gym TV screens for coaching and safety.
                                </p>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={formData.checkedPrivacy}
                                        onChange={(e) => updateField('checkedPrivacy', e.target.checked)}
                                        style={{ width: '18px', height: '18px' }}
                                    />
                                    <span style={{ fontSize: '0.9rem' }}>I understand and accept.</span>
                                </label>
                            </div>
                        )}

                        {/* Create Mode */}
                        {formData.gymMode === 'create' && (
                            <div>
                                <input
                                    type="text"
                                    placeholder="Enter Your New Gym Name"
                                    value={formData.gymSearch} // Reuse
                                    onChange={(e) => updateField('gymSearch', e.target.value)}
                                    style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', marginBottom: '16px' }}
                                />
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    You will be the Owner and Admin of this gym. Location will be set to your current device location later.
                                </p>
                            </div>
                        )}

                        {/* Code Mode */}
                        {formData.gymMode === 'code' && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Enter Access Code</label>
                                <input
                                    type="text"
                                    placeholder="TR-XXXXXX or AD-XXXXXX"
                                    value={formData.gymCode}
                                    onChange={(e) => updateField('gymCode', e.target.value.toUpperCase())}
                                    style={{ width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--primary)', borderRadius: '12px', color: 'white', fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px' }}
                                />
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                    Ask your gym owner for the code.
                                </p>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                            <button onClick={prevStep} style={{ padding: '16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '100px', fontWeight: 'bold', color: 'var(--text-muted)', cursor: 'pointer' }}>Back</button>

                            <button onClick={handleSkip} style={{ padding: '16px', background: 'transparent', border: 'none', fontWeight: 'normal', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '0.9rem' }}>Skip</button>

                            <button
                                onClick={() => {
                                    if (formData.gymMode === 'search' && formData.selectedGymVerified && !formData.checkedPrivacy) {
                                        return toastError("Please accept the privacy notice.");
                                    }
                                    if (formData.gymMode === 'search' && !formData.selectedGymId) return;

                                    nextStep();
                                }}
                                disabled={loading || (formData.gymMode === 'search' && !formData.selectedGymId)}
                                style={{ flex: 1, padding: '16px', background: 'var(--primary)', border: 'none', borderRadius: '100px', fontWeight: 'bold', color: 'black', fontSize: '1.1rem', cursor: 'pointer', opacity: loading || (formData.gymMode === 'search' && !formData.selectedGymId) ? 0.5 : 1 }}
                            >
                                Next: Privacy →
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 4: PRIVACY */}
                {step === 4 && (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Privacy & Data</h1>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>You are in control. Change these anytime.</p>

                        {/* Ghost Mode */}
                        <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--surface-highlight)', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>👻 Ghost Mode</span>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={formData.ghostMode}
                                        onChange={(e) => updateField('ghostMode', e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <p style={{ fontSize: '0.9rem', color: formData.ghostMode ? 'var(--text-main)' : 'var(--text-muted)' }}>
                                {formData.ghostMode
                                    ? "ON: You are hidden from live feeds and gym screens."
                                    : "OFF: Friends can see when you are working out."}
                            </p>
                            {formData.ghostMode && (
                                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '8px' }}>
                                    Note: You will not appear on Gym TV Leaderboards while Ghost Mode is active.
                                </div>
                            )}
                        </div>

                        {/* Profile Visibility */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Profile Visibility</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                {['public', 'friends', 'private'].map(v => (
                                    <button
                                        key={v}
                                        onClick={() => updateField('profileVisibility', v)}
                                        style={{
                                            flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border)',
                                            background: formData.profileVisibility === v ? 'var(--primary)' : 'transparent',
                                            color: formData.profileVisibility === v ? 'black' : 'var(--text-muted)',
                                            fontWeight: 'bold', textTransform: 'capitalize'
                                        }}
                                    >
                                        {v}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                            <button onClick={prevStep} style={{ padding: '16px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '100px', fontWeight: 'bold', color: 'var(--text-muted)', cursor: 'pointer' }}>Back</button>
                            <button
                                onClick={handleFinish}
                                disabled={loading}
                                style={{ flex: 1, padding: '16px', background: 'var(--primary)', border: 'none', borderRadius: '100px', fontWeight: 'bold', color: 'black', fontSize: '1.1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                            >
                                {loading ? 'Finalizing...' : 'Finish Setup'}
                            </button>
                        </div>

                        <style jsx>{`
                            .switch { position: relative; display: inline-block; width: 50px; height: 28px; }
                            .switch input { opacity: 0; width: 0; height: 0; }
                            .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: var(--border); transition: .4s; border-radius: 34px; }
                            .slider:before { position: absolute; content: ""; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                            input:checked + .slider { background-color: var(--primary); }
                            input:checked + .slider:before { transform: translateX(22px); }
                        `}</style>
                    </div>
                )}
            </div>
        </div>
    );
}
