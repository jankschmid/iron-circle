"use client";

import { useState } from 'react';
import { useStore } from '@/lib/store';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ToastProvider';

export default function NewProgramPage() {
    const { user } = useStore();
    const router = useRouter();
    const supabase = createClient();
    const { success, error: toastError } = useToast();

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleCreate = async () => {
        if (!name.trim()) return toastError("Name is required");
        setSaving(true);
        
        try {
            const { data, error } = await supabase
                .from('workout_plans')
                .insert({
                    creator_id: user.id,
                    name,
                    description,
                    is_public: isPublic,
                    category: 'Coach Blueprint'
                })
                .select()
                .single();

            if (error) throw error;
            
            success("Blueprint created!");
            router.push(`/trainer/dashboard`); // For now, redirect to dashboard. Later: redirect to blueprint builder.
        } catch (e) {
            toastError(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="portal-container" style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
            <Link href="/trainer/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', display: 'block' }}>
                ← Back to Dashboard
            </Link>

            <h1 style={{ marginBottom: '24px' }}>Create Blueprint</h1>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--surface)', padding: '24px', borderRadius: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Program Name</label>
                    <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. 12-Week Powerlifting Peak"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'white' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)' }}>Description</label>
                    <textarea 
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="What is the goal of this program?"
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--background)', color: 'white', minHeight: '100px' }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <label className="switch">
                        <input 
                            type="checkbox" 
                            checked={isPublic} 
                            onChange={e => setIsPublic(e.target.checked)} 
                        />
                        <span className="slider round"></span>
                    </label>
                    <div>
                        <div style={{ fontWeight: 'bold' }}>Public Blueprint</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Allow other users to find and clone this program.</div>
                    </div>
                </div>

                <button 
                    onClick={handleCreate}
                    disabled={saving}
                    style={{
                        marginTop: '24px',
                        padding: '16px', borderRadius: '100px', background: 'var(--primary)', color: 'black',
                        fontWeight: 'bold', border: 'none', cursor: 'pointer'
                    }}
                >
                    {saving ? 'Creating...' : 'Create Program Blueprint'}
                </button>
            </div>

            <style jsx global>{`
                .switch { position: relative; display: inline-block; width: 40px; height: 24px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #333; transition: .4s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 16px; width: 16px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: var(--primary); }
                input:checked + .slider:before { transform: translateX(16px); }
            `}</style>
        </div>
    );
}
