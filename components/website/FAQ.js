"use client";
import { motion } from 'framer-motion';

export default function FAQ() {
    return (
        <section className="py-24 px-6 lg:px-16 max-w-4xl mx-auto border-t border-white/5 relative z-10">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="mb-16 text-center"
            >
                <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight">Häufige Fragen</h2>
            </motion.div>

            <div className="space-y-4">
                {[
                    { q: "Ist IronCircle kostenlos für Athleten?", a: "Ja! Das Basis-Tracking, RPE/RIR Logging und der Zugang zu den Gym-Leaderboards sind 100% kostenlos. Für tiefergehende Analytics bieten wir einen Pro-Plan an." },
                    { q: "Kann ich die App nutzen, wenn mein Gym nicht gelistet ist?", a: "Absolut. Du kannst als 'Global Athlete' trainieren und baust deinen eigenen Track-Record auf. Dein Gym kann aber jederzeit von einem Admin bei uns registriert werden, um lokale Community-Features freizuschalten." },
                    { q: "Wie berechnet der Algorithmus den Progressive Overload?", a: "Wir nutzen deine eingegebenen Werte für Reps In Reserve (RIR) und Rate of Perceived Exertion (RPE), kombiniert mit deiner historischen Leistung, um exakt vorzugeben, ob du im nächsten Satz das Gewicht oder die Wiederholungen steigern solltest." },
                    { q: "Was bedeutet die 'Mastery Phase'?", a: "Anstatt das Gewicht hirnlos zu steigern und die Ausführung zu ruinieren, verlangt IronCircle, dass du ein Gewicht erst mit sauberen Wiederholungen und guter RIR 'meisterst', bevor dir ein höheres Gewicht vorgeschlagen wird." }
                ].map((faq, i) => (
                    <motion.details 
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.1 }}
                        className="group bg-[#050505] hover:bg-[#0a0a0a] border border-white/5 rounded-2xl p-6 transition-colors overflow-hidden cursor-pointer shadow-md"
                    >
                        <summary className="font-bold text-lg sm:text-xl text-white list-none flex justify-between items-center outline-none">
                            {faq.q}
                            <span className="group-open:rotate-45 transition-transform duration-300 text-brand text-3xl font-light leading-none">+</span>
                        </summary>
                        <div className="mt-4 text-zinc-400 font-light leading-relaxed pr-8 border-t border-white/5 pt-4">
                            {faq.a}
                        </div>
                    </motion.details>
                ))}
            </div>
        </section>
    );
}
