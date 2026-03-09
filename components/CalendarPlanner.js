import { useState, useMemo } from 'react';
import { useTranslation } from '@/context/TranslationContext';

export default function CalendarPlanner({
    events = [],
    challenges = [],
    onEventClick = () => { },
    onChallengeClick = () => { }
}) {
    const { t } = useTranslation();
    const [currentDate, setCurrentDate] = useState(new Date());

    const { daysInMonth, firstDayOfMonth } = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        return {
            daysInMonth: new Date(year, month + 1, 0).getDate(),
            firstDayOfMonth: new Date(year, month, 1).getDay() // 0 = Sun, 1 = Mon...
        };
    }, [currentDate]);

    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

    // Distribute items to days
    const calendarDays = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const days = [];

        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = new Date(year, month, i).toISOString().split('T')[0];

            const dayEvents = events.filter(e => {
                if (!e.event_date) return false;
                return e.event_date.startsWith(dateStr);
            });

            const dayChallenges = challenges.filter(c => {
                if (!c.start_date) return false;
                // Simplified: just mapping challenges by their start date for the calendar
                return c.start_date.startsWith(dateStr);
            });

            days.push({
                day: i,
                dateStr,
                events: dayEvents,
                challenges: dayChallenges
            });
        }
        return days;
    }, [currentDate, events, challenges, daysInMonth]);

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const weekDays = [t('Sun'), t('Mon'), t('Tue'), t('Wed'), t('Thu'), t('Fri'), t('Sat')];

    // Create empty cells for padding
    const paddingDays = Array.from({ length: firstDayOfMonth }).fill(null);

    return (
        <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden' }}>

            {/* Header Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <button onClick={prevMonth} style={{ background: '#222', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>&larr; {t('Prev')}</button>
                <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--primary)' }}>
                    {t(monthNames[currentDate.getMonth()])} {currentDate.getFullYear()}
                </h3>
                <button onClick={nextMonth} style={{ background: '#222', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>{t('Next')} &rarr;</button>
            </div>

            {/* Weekday Labels */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                {weekDays.map((day, i) => (
                    <div key={i} style={{ textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.9rem', padding: '8px 0' }}>
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {paddingDays.map((_, i) => (
                    <div key={`pad-${i}`} style={{ minHeight: '100px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }} />
                ))}

                {calendarDays.map((calDay) => {
                    const isToday = calDay.dateStr === new Date().toISOString().split('T')[0];
                    return (
                        <div key={calDay.day} style={{
                            minHeight: '100px',
                            background: isToday ? 'rgba(255, 200, 0, 0.05)' : 'var(--background)',
                            border: isToday ? '1px solid var(--primary)' : '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '8px',
                            display: 'flex', flexDirection: 'column', gap: '4px'
                        }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: isToday ? 'var(--primary)' : 'var(--text-muted)', marginBottom: '4px' }}>
                                {calDay.day}
                            </div>

                            {/* Render Events */}
                            {calDay.events.map(ev => (
                                <div
                                    key={`ev-${ev.id}`}
                                    onClick={() => onEventClick(ev)}
                                    style={{ background: '#00d2ff22', borderLeft: '3px solid #00d2ff', padding: '4px 6px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#00d2ff' }}
                                    title={ev.title}
                                >
                                    📅 {ev.title}
                                </div>
                            ))}

                            {/* Render Challenges */}
                            {calDay.challenges.map(ch => (
                                <div
                                    key={`ch-${ch.id}`}
                                    onClick={() => onChallengeClick(ch)}
                                    style={{ background: 'rgba(255, 200, 0, 0.1)', borderLeft: '3px solid var(--primary)', padding: '4px 6px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--primary)' }}
                                    title={ch.title}
                                >
                                    🏆 {ch.title}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
