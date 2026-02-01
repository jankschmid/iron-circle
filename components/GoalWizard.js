"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoalWizard({ currentGoal, onSave, onClose }) {
    const [step, setStep] = useState(1);
    const [daysPerWeek, setDaysPerWeek] = useState(3);
    const [calculatedGoal, setCalculatedGoal] = useState(null);

    const handleCalculate = () => {
        // Logic: Days * 52 * 0.85 (Consistency Factor - people get sick, holiday, etc.)
        const logic = Math.round(daysPerWeek * 52 * 0.85);
        setCalculatedGoal(logic);
        setStep(2);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
        }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    background: 'var(--surface)',
                    width: '100%',
                    maxWidth: '400px',
                    borderRadius: 'var(--radius-lg)',
                    padding: '24px',
                    border: '1px solid var(--border)'
                }}
            >
                <AnimatePresence mode="wait">
                    {step === 1 ? (
                        <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Let's set a realistic goal 🎯</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
                                Consistency beats intensity. How many days per week can you <b>realistically</b> commit to?
                            </p>

                            <div style={{ marginBottom: '40px', textAlign: 'center' }}>
                                <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)', marginBottom: '16px' }}>
                                    {daysPerWeek} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>days/week</span>
                                </div>
                                <input
                                    type="range"
                                    min="1"
                                    max="7"
                                    value={daysPerWeek}
                                    onChange={(e) => setDaysPerWeek(parseInt(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--primary)' }}
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    <span>Casual</span>
                                    <span>Serious</span>
                                    <span>Machine</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={onClose}
                                    style={{ flex: 1, padding: '14px', background: 'transparent', border: 'none', color: 'var(--text-muted)' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCalculate}
                                    style={{ flex: 1, padding: '14px', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', color: 'black' }}
                                >
                                    Calculate
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>Recommended Goal 🚀</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
                                Based on {daysPerWeek} days/week and factoring in illness, holidays, and deload weeks (85% consistency).
                            </p>

                            <div style={{
                                background: 'var(--surface-highlight)',
                                padding: '24px',
                                borderRadius: '16px',
                                textAlign: 'center',
                                marginBottom: '24px',
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '4px' }}>YOUR ANNUAL TARGET</div>
                                <div style={{ fontSize: '3.5rem', fontWeight: '900', lineHeight: 1, color: 'var(--white)' }}>
                                    {calculatedGoal}
                                </div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--success)', marginTop: '8px', fontWeight: 'bold' }}>
                                    Achievable & Sustainable
                                </div>
                            </div>

                            <button
                                onClick={() => onSave(calculatedGoal)}
                                style={{ width: '100%', padding: '16px', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 'bold', fontSize: '1rem', color: 'black' }}
                            >
                                Set Goal to {calculatedGoal}
                            </button>
                            <button
                                onClick={() => setStep(1)}
                                style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', marginTop: '8px' }}
                            >
                                Back
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
