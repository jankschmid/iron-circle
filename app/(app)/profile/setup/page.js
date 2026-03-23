"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useStore } from '@/lib/store';
import { useToast } from '@/components/ToastProvider';
import AvatarEditor from '@/components/AvatarEditor';
import { generateStarterRoutines } from '@/lib/workoutBlueprints';
import { motion, AnimatePresence } from 'framer-motion';

// ── Grace Period calculation (mirrors the SQL RPC logic) ──────────────────────
function calcGracePeriod(yearlyGoal) {
    const w = Math.max(Number(yearlyGoal) / 52, 1);
    const hours = (7 / w) * 24 + 24;
    const days = (hours / 24).toFixed(1);
    return { hours: Math.round(hours), days };
}

// ── Training style options ────────────────────────────────────────────────────
const TRAINING_STYLES = [
    { id: 'Bodybuilding', emoji: '🏋️', label: 'Bodybuilding' },
    { id: 'Powerlifting', emoji: '💪', label: 'Powerlifting' },
    { id: 'Calisthenics', emoji: '🤸', label: 'Calisthenics' },
    { id: 'Crossfit', emoji: '⚡', label: 'CrossFit' },
    { id: 'Endurance', emoji: '🏃', label: 'Endurance' },
    { id: 'General Fitness', emoji: '🎯', label: 'General Fitness' },
];

// ── Target rep ranges (Smart Suggestions) ────────────────────────────────────
const REP_RANGES = [
    { min: 1, max: 5, label: '1–5  (Strength / Max Effort)' },
    { min: 3, max: 6, label: '3–6  (Powerbuilding)' },
    { min: 6, max: 8, label: '6–8  (Hypertrophy – Heavy)' },
    { min: 8, max: 12, label: '8–12 (Hypertrophy – Classic)' },
    { min: 12, max: 15, label: '12–15 (Hypertrophy – Light)' },
    { min: 15, max: 20, label: '15–20 (Muscular Endurance)' },
];

const TOTAL_STEPS = 5;

export default function OnboardingWizard() {
    const { user, updateUserProfile, saveUserGym } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const { success: toastSuccess, error: toastError } = useToast();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showAvatarEditor, setShowAvatarEditor] = useState(false);
    const [gymResults, setGymResults] = useState([]);

    const [formData, setFormData] = useState({
        // Step 1
        username: '',
        name: '',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
        // Step 2
        gender: '',
        height: '',
        weight: '',
        // Step 3 (NEW)
        trainingStyle: '',
        repRangeMin: 8,
        repRangeMax: 12,
        yearlyGoal: 104,          // Default: 2x/week
        // Step 4 – Gym
        gymMode: 'search',
        gymSearch: '',
        gymCode: '',
        selectedGymId: null,
        selectedGymName: '',
        selectedGymVerified: false,
        checkedPrivacy: false,
        autoTrackGym: true,        // moved here from privacy
        // Step 5 – Privacy
        profileVisibility: 'public',  // pre-selected as public
        ghostMode: false,
    });

    const DEFAULT_AVATARS = ['Felix', 'Aneka', 'Zoe', 'Jack', 'Milo', 'Bella', 'Leo', 'Lilly', 'Max', 'Sam', 'Nala', 'Kai'];
    const [avatarOptions, setAvatarOptions] = useState(DEFAULT_AVATARS.map(s => `https://api.dicebear.com/7.x/avataaars/svg?seed=${s}`));
    const shuffleAvatars = () => setAvatarOptions(Array.from({ length: 12 }, () => `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random().toString(36).slice(7)}`));

    useEffect(() => {
        if (user) {
            setFormData(p => ({
                ...p,
                username: user.handle?.replace('@', '') || '',
                name: user.name || '',
                avatar: user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
            }));
        }
    }, [user]);

    // Auto-sync Target Range when Training Style is selected
    useEffect(() => {
        if (formData.trainingStyle) {
            let recommendedRange = REP_RANGES.find(r => r.min === 8 && r.max === 12); // Default classic

            switch (formData.trainingStyle) {
                case 'Powerlifting':
                    recommendedRange = REP_RANGES.find(r => r.min === 1 && r.max === 5);
                    break;
                case 'Bodybuilding':
                case 'General Fitness':
                    recommendedRange = REP_RANGES.find(r => r.min === 8 && r.max === 12);
                    break;
                case 'Endurance':
                    recommendedRange = REP_RANGES.find(r => r.min === 15 && r.max === 20);
                    break;
                case 'Calisthenics':
                case 'Crossfit':
                    recommendedRange = REP_RANGES.find(r => r.min === 6 && r.max === 8);
                    break;
            }

            if (recommendedRange) {
                setFormData(p => ({
                    ...p,
                    repRangeMin: recommendedRange.min,
                    repRangeMax: recommendedRange.max
                }));
            }
        }
    }, [formData.trainingStyle]);

    // If already set up, bounce to home
    useEffect(() => {
        if (user?.setup_completed) router.replace('/');
    }, [user?.setup_completed]);

    const updateField = (k, v) => setFormData(p => ({ ...p, [k]: v }));
    const nextStep = () => setStep(p => p + 1);
    const prevStep = () => setStep(p => Math.max(1, p - 1));

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.clear();
        window.location.href = '/login';
    };

    // ── VALIDATIONS ────────────────────────────────────────────────────────────
    const validateStep1 = async () => {
        if (!formData.username || formData.username.length < 3) return toastError("Username too short (min 3 chars)");
        if (!/^[a-zA-Z0-9]+$/.test(formData.username)) return toastError("Letters and numbers only — no spaces or symbols");
        setLoading(true);
        try {
            if (user && formData.username !== user.handle?.replace('@', '')) {
                const { data: existing } = await supabase.from('profiles').select('id').eq('username', formData.username).maybeSingle();
                if (existing && existing.id !== user.id) return toastError("Username already taken");
            }
            nextStep();
        } catch (e) { toastError("Error checking username"); }
        finally { setLoading(false); }
    };

    const validateStep2 = () => {
        if (!formData.gender) return toastError("Please select a gender");
        if (!formData.weight) return toastError("Please enter your weight");
        if (!formData.height) return toastError("Please enter your height");
        nextStep();
    };

    const validateStep3 = () => {
        if (!formData.trainingStyle) return toastError("Please pick a training style");
        nextStep();
    };

    const validateStep4 = () => {
        if (formData.gymMode === 'search' && formData.selectedGymVerified && !formData.checkedPrivacy)
            return toastError("Please accept the Verified Gym privacy notice.");
        nextStep();
    };

    // ── GYM SEARCH ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (step !== 4) return;
        if (formData.gymMode === 'search' && formData.gymSearch.length > 2) {
            const t = setTimeout(async () => {
                const { data } = await supabase.from('gyms').select('id, name, address, is_verified').ilike('name', `%${formData.gymSearch}%`).limit(5);
                setGymResults(data || []);
            }, 500);
            return () => clearTimeout(t);
        } else { setGymResults([]); }
    }, [formData.gymSearch, formData.gymMode, step]);

    // ── FINISH ──────────────────────────────────────────────────────────────────
    const handleFinish = async () => {
        setLoading(true);
        try {
            // First ensure we have the auth user ID (in case Zustand is hydrating)
            let currentUserId = user?.id;
            if (!currentUserId) {
                const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
                if (sessionErr || !session?.user?.id) throw new Error("No active session found. Please refresh.");
                currentUserId = session.user.id;
            }

            let cleanUsername = formData.username.replace(/[^a-zA-Z0-9]/g, '').slice(0, 15) || ('u' + Date.now().toString().slice(-8));
            if (cleanUsername.length < 3) cleanUsername += Math.floor(Math.random() * 10);

            // Deduce the main backend tracking goal from the specific training style
            let derivedGoal = 'Hypertrophy'; // Fallback
            switch (formData.trainingStyle) {
                case 'Powerlifting':
                case 'Calisthenics':
                    derivedGoal = 'Strength';
                    break;
                case 'Endurance':
                    derivedGoal = 'Endurance';
                    break;
                case 'General Fitness':
                    derivedGoal = 'Weight Loss';
                    break;
                case 'Bodybuilding':
                case 'Crossfit':
                default:
                    derivedGoal = 'Hypertrophy';
                    break;
            }

            // 1. Upsert profile with ALL collected data + setup_completed = true
            const { error: pErr } = await supabase.from('profiles').upsert({
                id: currentUserId,
                username: cleanUsername,
                name: formData.name,
                avatar_url: formData.avatar,
                gender: formData.gender,
                height: parseFloat(formData.height) || null,
                weight: parseFloat(formData.weight) || null,
                goal: derivedGoal,
                // New fields
                training_style: formData.trainingStyle,
                rep_range_min: formData.repRangeMin,
                rep_range_max: formData.repRangeMax,
                yearly_workout_goal: Number(formData.yearlyGoal) || 104,
                // Privacy
                privacy_settings: {
                    profile_visibility: formData.profileVisibility,
                    live_status: !formData.ghostMode,
                    gym_monitor_streaming: !formData.ghostMode,
                    auto_track_gym: formData.autoTrackGym
                },
                // ▶ THE FIX: mark setup as done so routing guard never re-triggers
                setup_completed: true,
                updated_at: new Date()
            });
            if (pErr) throw pErr;

            // Generate Starter Routines
            try {
                const routines = generateStarterRoutines({
                    training_style: formData.trainingStyle,
                    rep_range_min: formData.repRangeMin,
                    rep_range_max: formData.repRangeMax,
                    yearly_workout_goal: Number(formData.yearlyGoal) || 104
                });

                if (routines.length > 0) {
                    const inserts = routines.map(r => ({
                        user_id: currentUserId,
                        name: r.name,
                        visibility: 'private',
                        exercises: r.exercises
                    }));
                    const { error: rErr } = await supabase.from('workout_templates').insert(inserts);
                    if (rErr) console.error("Error creating starter routines:", rErr);
                }
            } catch (rErr) {
                console.error("Failed generating starter routines:", rErr);
            }

            // 2. Handle Gym
            if (formData.gymMode === 'code' && formData.gymCode) {
                const { data: res, error: rpcErr } = await supabase.rpc('join_gym_with_code', { p_code: formData.gymCode });
                if (rpcErr && !rpcErr.message?.includes('already')) throw rpcErr;
                if (res?.success) toastSuccess(`Joined ${res.gym_name}!`);
            } else if (formData.gymMode === 'create' && formData.gymSearch) {
                await saveUserGym(formData.gymSearch, 0, 0, 'My Gym', null, 'wizard');
            } else if (formData.gymMode === 'search' && formData.selectedGymId) {
                const { error: gymErr } = await supabase.from('user_gyms').insert({
                    user_id: currentUserId, gym_id: formData.selectedGymId,
                    label: formData.selectedGymName || 'Main Gym', is_default: true, role: 'member'
                });
                if (gymErr && gymErr.code !== '23505') throw gymErr; // ignore duplicate
            }

            // 3. Sync local store
            updateUserProfile({
                handle: '@' + cleanUsername,
                name: formData.name,
                avatar: formData.avatar,
                level: user?.level || 1,
                height: parseFloat(formData.height),
                weight: parseFloat(formData.weight),
                setup_completed: true
            });

            toastSuccess("Welcome to IronCircle! 🔥");
            window.location.href = '/';

        } catch (err) {
            console.error("Setup error:", err);
            toastError("Error: " + err.message);
            setLoading(false);
        }
    };

    // ── GRACE PERIOD PREVIEW ────────────────────────────────────────────────────
    const { hours: graceHours, days: graceDays } = calcGracePeriod(formData.yearlyGoal);

    // ── SHARED STYLES ──────────────────────────────────────────────────────────
    const inputStyle = { width: '100%', padding: '16px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '12px', color: 'white', boxSizing: 'border-box' };
    const btnPrimary = { flex: 1, padding: '16px', background: 'var(--primary)', border: 'none', borderRadius: '100px', fontWeight: 'bold', color: 'black', fontSize: '1.1rem', cursor: 'pointer' };
    const btnGhost = { padding: '16px 20px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '100px', fontWeight: 'bold', color: 'var(--text-muted)', cursor: 'pointer' };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'calc(env(safe-area-inset-top, 40px) + 20px) 20px 20px 20px' }}>

            {/* ── PERSISTENT HEADER ───────────────────────────────────────── */}
            <div style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', marginBottom: '8px' }}>
                <button
                    onClick={step === 1 ? undefined : prevStep}
                    disabled={step === 1}
                    style={{ background: 'transparent', border: 'none', color: step === 1 ? 'transparent' : 'var(--text-muted)', cursor: step === 1 ? 'default' : 'pointer', fontSize: '1rem', padding: '8px', borderRadius: '8px' }}
                >
                    ← Back
                </button>

                {/* Step indicators */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                        <div key={i} style={{ width: i + 1 === step ? 24 : 8, height: 8, borderRadius: '100px', background: i + 1 <= step ? 'var(--primary)' : 'var(--border)', transition: 'all 0.3s' }} />
                    ))}
                </div>

                <button
                    onClick={handleLogout}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', padding: '6px 12px', borderRadius: '8px' }}
                >
                    Logout
                </button>
            </div>

            {/* ── WIZARD CARD ─────────────────────────────────────────────── */}
            <div style={{ width: '100%', maxWidth: '500px', background: 'var(--surface)', padding: '32px', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <AnimatePresence mode="wait">

                    {/* ═══ STEP 1: IDENTITY ════════════════════════════════════ */}
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Who are you?</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Choose your identity in IronCircle.</p>

                            {/* Avatar picker */}
                            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                                <img src={formData.avatar} style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid var(--primary)', marginBottom: '12px' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Pick an avatar</span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setShowAvatarEditor(true)} style={{ fontSize: '0.8rem', padding: '5px 10px', borderRadius: '100px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--primary)' }}>✏️ Customize</button>
                                        <button onClick={shuffleAvatars} style={{ fontSize: '0.8rem', padding: '5px 10px', borderRadius: '100px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--primary)' }}>🎲 Shuffle</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                                    {avatarOptions.map((url, i) => (
                                        <img key={i} src={url} onClick={() => updateField('avatar', url)}
                                            style={{ width: '100%', aspectRatio: '1/1', borderRadius: '50%', cursor: 'pointer', border: formData.avatar === url ? '2px solid var(--primary)' : '2px solid transparent', opacity: formData.avatar === url ? 1 : 0.6 }}
                                        />
                                    ))}
                                </div>
                                {showAvatarEditor && <AvatarEditor initialUrl={formData.avatar} onSave={url => { updateField('avatar', url); setShowAvatarEditor(false); }} onCancel={() => setShowAvatarEditor(false)} />}
                            </div>

                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Username</label>
                                <input type="text" value={formData.username} onChange={e => updateField('username', e.target.value.trim())} placeholder="ironwolf" style={inputStyle} />
                            </div>
                            <div style={{ marginBottom: '28px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Display Name</label>
                                <input type="text" value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="John Doe" style={inputStyle} />
                            </div>

                            <button onClick={validateStep1} disabled={loading} style={btnPrimary}>{loading ? 'Checking...' : 'Next: Body Stats →'}</button>
                        </motion.div>
                    )}

                    {/* ═══ STEP 2: BODY STATS ══════════════════════════════════ */}
                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Your Stats</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Helps calibrate your smart suggestions.</p>

                            {/* Gender */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                {['Male', 'Female', 'Divers', 'n/a'].map(g => (
                                    <button key={g} onClick={() => updateField('gender', g)}
                                        style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border)', background: formData.gender === g ? 'var(--primary)' : 'var(--background)', color: formData.gender === g ? 'black' : 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                                        {g === 'n/a' ? 'Prefer not to say' : g}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Height (cm)</label>
                                    <input type="number" value={formData.height} onChange={e => updateField('height', e.target.value)} placeholder="180" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Weight (kg)</label>
                                    <input type="number" value={formData.weight} onChange={e => updateField('weight', e.target.value)} placeholder="80" style={inputStyle} />
                                </div>
                            </div>

                            <button onClick={validateStep2} style={btnPrimary}>Next: Training Style →</button>
                        </motion.div>
                    )}

                    {/* ═══ STEP 3: TRAINING PREFERENCES (NEW) ══════════════════ */}
                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Training Setup</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Powers your Smart Suggestions & Streak grace period.</p>

                            {/* Training Style chips */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Training Style</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                                    {TRAINING_STYLES.map(s => (
                                        <button key={s.id} onClick={() => updateField('trainingStyle', s.id)}
                                            style={{ padding: '14px', borderRadius: '12px', border: `1px solid ${formData.trainingStyle === s.id ? 'var(--primary)' : 'var(--border)'}`, background: formData.trainingStyle === s.id ? 'rgba(var(--primary-rgb, 50,255,126), 0.12)' : 'var(--background)', color: formData.trainingStyle === s.id ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span style={{ fontSize: '1.3rem' }}>{s.emoji}</span> {s.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Rep Range */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Smart Suggestions Target Range</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {REP_RANGES.map(r => (
                                        <button key={`${r.min}-${r.max}`} onClick={() => { updateField('repRangeMin', r.min); updateField('repRangeMax', r.max); }}
                                            style={{ padding: '12px 16px', borderRadius: '10px', border: `1px solid ${formData.repRangeMin === r.min && formData.repRangeMax === r.max ? 'var(--primary)' : 'var(--border)'}`, background: formData.repRangeMin === r.min && formData.repRangeMax === r.max ? 'rgba(var(--primary-rgb, 50,255,126), 0.1)' : 'var(--background)', color: formData.repRangeMin === r.min && formData.repRangeMax === r.max ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', textAlign: 'left', fontSize: '0.9rem' }}>
                                            {r.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Annual Workout Goal + Live Grace Period */}
                            <div style={{ marginBottom: '28px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                    Annual Workout Goal — <strong style={{ color: 'white' }}>{formData.yearlyGoal}</strong> workouts/year ({Math.round(formData.yearlyGoal / 52 * 10) / 10}×/week)
                                </label>
                                <input
                                    type="range" min={26} max={365} step={1}
                                    value={formData.yearlyGoal}
                                    onChange={e => updateField('yearlyGoal', Number(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary)', margin: '8px 0' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '12px' }}>
                                    <span>26/year (×0.5/wk)</span><span>365/year (daily)</span>
                                </div>

                                {/* Live Grace Period Preview */}
                                <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '12px', padding: '14px' }}>
                                    <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '4px' }}>
                                        🔥 Streak Grace Period: {graceDays} days ({graceHours}h)
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Based on your goal, your streak is safe for up to <strong style={{ color: 'white' }}>{graceDays} days</strong> of rest. Miss it and the streak resets. Rest days are fully covered — no stress!
                                    </div>
                                </div>
                            </div>

                            <button onClick={validateStep3} style={btnPrimary}>Next: Gym →</button>
                        </motion.div>
                    )}

                    {/* ═══ STEP 4: GYM + AUTO-TRACK ════════════════════════════ */}
                    {step === 4 && (
                        <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Find your Gym</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>Join a community or start your own.</p>

                            {/* Tabs */}
                            <div style={{ display: 'flex', background: 'var(--background)', padding: '4px', borderRadius: '100px', marginBottom: '20px' }}>
                                {['search', 'create', 'code'].map(m => (
                                    <button key={m} onClick={() => updateField('gymMode', m)}
                                        style={{ flex: 1, padding: '10px', borderRadius: '100px', background: formData.gymMode === m ? 'var(--surface)' : 'transparent', color: formData.gymMode === m ? 'white' : 'var(--text-muted)', border: 'none', fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize' }}>
                                        {m === 'code' ? 'Staff Code' : m.charAt(0).toUpperCase() + m.slice(1)}
                                    </button>
                                ))}
                            </div>

                            {formData.gymMode === 'search' && (
                                <div>
                                    <input type="text" placeholder="🔍 Search by Name or City..." value={formData.gymSearch} onChange={e => updateField('gymSearch', e.target.value)} autoFocus style={{ ...inputStyle, marginBottom: '12px' }} />
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {gymResults.map(g => (
                                            <div key={g.id} onClick={() => setFormData(p => ({ ...p, selectedGymId: g.id, selectedGymName: g.name, selectedGymVerified: g.is_verified }))}
                                                style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px', background: formData.selectedGymId === g.id ? 'rgba(var(--primary-rgb, 50,255,126), 0.1)' : 'var(--background)', border: `1px solid ${formData.selectedGymId === g.id ? 'var(--primary)' : 'var(--border)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: formData.selectedGymId === g.id ? 'var(--primary)' : 'inherit' }}>{g.name} {g.is_verified && '✅'}</div>
                                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{g.address || 'No address'}</div>
                                                </div>
                                                {g.is_verified && <span style={{ fontSize: '0.7rem', background: '#FFC800', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>PARTNER</span>}
                                            </div>
                                        ))}
                                        {gymResults.length === 0 && formData.gymSearch.length > 2 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No gyms found.</p>}
                                        {gymResults.length === 0 && formData.gymSearch.length <= 2 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '12px', fontSize: '0.9rem' }}>Type at least 3 characters to search.</p>}
                                    </div>
                                    {formData.selectedGymVerified && (
                                        <div style={{ marginTop: '12px', padding: '14px', background: 'rgba(255,200,0,0.1)', border: '1px solid #FFC800', borderRadius: '12px' }}>
                                            <p style={{ color: '#FFC800', fontWeight: 'bold', marginBottom: '6px' }}>⚠️ Verified Partner Gym</p>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Your workout data may be visible to Gym Staff and on TV screens.</p>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                                <input type="checkbox" checked={formData.checkedPrivacy} onChange={e => updateField('checkedPrivacy', e.target.checked)} style={{ width: '18px', height: '18px' }} />
                                                <span style={{ fontSize: '0.9rem' }}>I understand and accept.</span>
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {formData.gymMode === 'create' && (
                                <div>
                                    <input type="text" placeholder="Enter Your New Gym Name" value={formData.gymSearch} onChange={e => updateField('gymSearch', e.target.value)} style={{ ...inputStyle, marginBottom: '8px' }} />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You'll be the Owner and Admin of this gym.</p>
                                </div>
                            )}

                            {formData.gymMode === 'code' && (
                                <div>
                                    <label style={{ display: 'block', marginBottom: '6px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Enter Access Code</label>
                                    <input type="text" placeholder="TR-XXXXXX or AD-XXXXXX" value={formData.gymCode} onChange={e => updateField('gymCode', e.target.value.toUpperCase())} style={{ ...inputStyle, fontSize: '1.2rem', textAlign: 'center', letterSpacing: '2px', border: '1px solid var(--primary)' }} />
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>Ask your gym owner for the code.</p>
                                </div>
                            )}

                            {/* Auto-Track Gym toggle — moved here from Privacy */}
                            <div style={{ marginTop: '20px', padding: '16px', background: 'var(--surface-highlight)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>📡 Auto-Track Gym Visits</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Automatically logs when you arrive at your gym.</div>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0 }}>
                                        <input type="checkbox" checked={formData.autoTrackGym} onChange={e => updateField('autoTrackGym', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: formData.autoTrackGym ? 'var(--primary)' : 'var(--border)', borderRadius: '34px', transition: '0.3s' }}>
                                            <span style={{ position: 'absolute', height: '20px', width: '20px', left: formData.autoTrackGym ? '26px' : '4px', bottom: '4px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
                                        </span>
                                    </label>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                                <button onClick={() => { updateField('selectedGymId', null); nextStep(); }} style={{ ...btnGhost, fontSize: '0.9rem', color: 'var(--text-dim)' }}>Skip</button>
                                <button onClick={validateStep4} disabled={formData.gymMode === 'search' && formData.selectedGymVerified && !formData.checkedPrivacy}
                                    style={{ ...btnPrimary, opacity: formData.gymMode === 'search' && formData.selectedGymVerified && !formData.checkedPrivacy ? 0.5 : 1 }}>
                                    Next: Privacy →
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* ═══ STEP 5: PRIVACY ═════════════════════════════════════ */}
                    {step === 5 && (
                        <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
                            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Privacy & Sharing</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '28px' }}>You're in control. Change anytime in Settings.</p>

                            {/* Ghost Mode */}
                            <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--surface-highlight)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>👻 Ghost Mode</div>
                                        <div style={{ fontSize: '0.8rem', color: formData.ghostMode ? 'var(--warning)' : 'var(--text-muted)', marginTop: '2px' }}>
                                            {formData.ghostMode ? 'ON — Hidden from live feeds & gym screens.' : 'OFF — Friends can see when you\'re working out.'}
                                        </div>
                                    </div>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px', flexShrink: 0 }}>
                                        <input type="checkbox" checked={formData.ghostMode} onChange={e => updateField('ghostMode', e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                                        <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: formData.ghostMode ? 'var(--warning)' : 'var(--border)', borderRadius: '34px', transition: '0.3s' }}>
                                            <span style={{ position: 'absolute', height: '20px', width: '20px', left: formData.ghostMode ? '26px' : '4px', bottom: '4px', background: 'white', borderRadius: '50%', transition: '0.3s' }} />
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Profile Visibility — Public pre-selected, improved labels */}
                            <div style={{ marginBottom: '28px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Profile Visibility</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[
                                        { value: 'public', label: 'Public (Recommended)', sub: 'Let your friends and the community hype you up! 🔥' },
                                        { value: 'friends', label: 'Friends Only', sub: 'Only people you follow can see your profile & workouts.' },
                                        { value: 'private', label: 'Private', sub: 'Only you can see your data. No social features.' },
                                    ].map(opt => (
                                        <button key={opt.value} onClick={() => updateField('profileVisibility', opt.value)}
                                            style={{ padding: '14px 16px', borderRadius: '12px', border: `1px solid ${formData.profileVisibility === opt.value ? 'var(--primary)' : 'var(--border)'}`, background: formData.profileVisibility === opt.value ? 'rgba(var(--primary-rgb, 50,255,126), 0.1)' : 'var(--background)', cursor: 'pointer', textAlign: 'left' }}>
                                            <div style={{ fontWeight: 'bold', color: formData.profileVisibility === opt.value ? 'var(--primary)' : 'white' }}>{opt.label}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{opt.sub}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button onClick={handleFinish} disabled={loading}
                                style={{ ...btnPrimary, opacity: loading ? 0.7 : 1, width: '100%' }}>
                                {loading ? '⏳ Setting up your account...' : '🚀 Enter IronCircle'}
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
