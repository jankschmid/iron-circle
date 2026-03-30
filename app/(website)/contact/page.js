"use client";
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Send, CheckCircle2, MessageSquare } from 'lucide-react';

export default function ContactPage() {
    const [status, setStatus] = useState('idle'); // idle, loading, success
    const [formData, setFormData] = useState({ name: '', email: '', message: '' });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Network error');
            setStatus('success');
            setFormData({ name: '', email: '', message: '' });
        } catch (error) {
            console.error(error);
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen bg-[#020202] text-zinc-200 font-sans selection:bg-brand/30 selection:text-brand flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-black/40 backdrop-blur-2xl sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/assets/logo/Iron-Circle_Logo_Two_Color.svg" alt="IronCircle Logo" className="w-8 h-8" />
                    <span className="text-xl font-extrabold tracking-tight text-white hidden sm:block">ironCircle</span>
                </div>
                <Link href="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium">
                    <ArrowLeft className="w-4 h-4" /> Back to Home
                </Link>
            </header>

            <main className="flex-1 flex items-center justify-center p-6 py-20 relative overflow-hidden">
                {/* Ambient Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/5 blur-[150px] rounded-full pointer-events-none z-0" />
                
                <div className="w-full max-w-2xl relative z-10">
                    <div className="text-center mb-12">
                        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-brand shadow-inner mx-auto mb-6">
                            <MessageSquare className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-4">Get in Touch</h1>
                        <p className="text-zinc-400 text-lg font-light">Egal ob du Athlete bist oder Gym Owner – wir hören dir zu.</p>
                    </div>

                    <div className="bg-[#050505] border border-white/5 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
                        {status === 'success' ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center animate-in fade-in zoom-in duration-500">
                                <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mb-6">
                                    <CheckCircle2 className="w-10 h-10 text-brand" />
                                </div>
                                <h3 className="text-3xl font-black text-white mb-4">Nachricht gesendet!</h3>
                                <p className="text-zinc-400 font-light mb-8 max-w-sm">
                                    Vielen Dank für deine Anfrage. Unser Team meldet sich in Kürze bei dir.
                                </p>
                                <button 
                                    onClick={() => setStatus('idle')}
                                    className="px-8 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                                >
                                    Neue Nachricht schreiben
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-400 uppercase tracking-widest pl-1">Dein Name</label>
                                        <input 
                                            type="text" 
                                            required
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-5 py-4 bg-black border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium"
                                            placeholder="z.B. Chris Bumstead"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-zinc-400 uppercase tracking-widest pl-1">E-Mail Adresse</label>
                                        <input 
                                            type="email" 
                                            required
                                            value={formData.email}
                                            onChange={e => setFormData({...formData, email: e.target.value})}
                                            className="w-full px-5 py-4 bg-black border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium"
                                            placeholder="cbum@olympia.com"
                                        />
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-zinc-400 uppercase tracking-widest pl-1">Nachricht</label>
                                    <textarea 
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={e => setFormData({...formData, message: e.target.value})}
                                        className="w-full px-5 py-4 bg-black border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 transition-all font-medium resize-none"
                                        placeholder="Wie können wir dir helfen?"
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={status === 'loading'}
                                    className="w-full relative flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-brand to-brand-dark text-black font-extrabold text-lg rounded-xl transition-all duration-300 shadow-[0_0_20px_rgba(250,255,0,0.2)] hover:shadow-[0_0_40px_rgba(250,255,0,0.4)] hover:-translate-y-1 overflow-hidden disabled:opacity-70 disabled:pointer-events-none group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-[0%] transition-transform duration-300" />
                                    <span className="relative z-10 flex items-center gap-2">
                                        {status === 'loading' ? 'Wird gesendet...' : 'Nachricht senden'}
                                        {status !== 'loading' && <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
                                    </span>
                                </button>
                                
                                {status === 'error' && (
                                    <p className="text-red-500 text-sm text-center font-medium mt-4">
                                        Es gab einen Fehler. Bitte versuche es noch einmal oder schreibe direkt an info@iron-circle.app.
                                    </p>
                                )}
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
