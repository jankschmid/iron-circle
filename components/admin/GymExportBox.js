import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function GymExportBox({ gymId }) {
    const [supabase] = useState(() => createClient());
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const downloadCSV = (data, filename) => {
        if (!data || data.length === 0) {
            alert('No data available to export.');
            return;
        }

        const headers = Object.keys(data[0]);
        const csvRows = [];
        csvRows.push(headers.join(','));

        for (const row of data) {
            const values = headers.map(header => {
                const escaped = ('' + (row[header] ?? '')).replace(/"/g, '""');
                return `"${escaped}"`;
            });
            csvRows.push(values.join(','));
        }

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportEngagement = async () => {
        if (!gymId) return alert("Gym ID is required.");
        const { data, error } = await supabase.rpc('export_gym_analytics_engagement', {
            p_gym_id: gymId,
            p_start_date: startDate ? new Date(startDate).toISOString() : null,
            p_end_date: endDate ? new Date(endDate).toISOString() : null
        });
        if (error) return alert("Export Failed: " + error.message);
        downloadCSV(data, `Gym_Engagement_${new Date().toISOString().split('T')[0]}.csv`);
    };

    const handleExportChallenges = async () => {
        if (!gymId) return alert("Gym ID is required.");
        const { data, error } = await supabase.rpc('export_gym_analytics_challenges', {
            p_gym_id: gymId,
            p_start_date: startDate ? new Date(startDate).toISOString() : null,
            p_end_date: endDate ? new Date(endDate).toISOString() : null
        });
        if (error) return alert("Export Failed: " + error.message);
        downloadCSV(data, `Gym_Challenges_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <div style={{ background: '#222', padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff', margin: 0 }}>Gym Analytics Export</h3>
            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '8px' }}>
                Download activity and challenge participation data for your members.
            </p>
            
            {/* Date Range Filter */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>Start Date (Optional)</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '0.8rem', color: '#aaa', fontWeight: 'bold' }}>End Date (Optional)</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #444', background: '#111', color: '#fff', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ alignSelf: 'flex-end', color: '#666', fontSize: '0.8rem', paddingBottom: '10px' }}>
                    *Defaults to current month if empty.
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <button
                    onClick={handleExportEngagement}
                    style={{
                        background: '#333', color: '#fff', border: '1px solid #444', padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', transition: 'background 0.2s'
                    }}
                >
                    <span>📊 Gym-Report 1: Engagement</span>
                </button>
                <button
                    onClick={handleExportChallenges}
                    style={{
                        background: '#333', color: '#fff', border: '1px solid #444', padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 'bold', transition: 'background 0.2s'
                    }}
                >
                    <span>🏆 Gym-Report 2: Challenges</span>
                </button>
            </div>
        </div>
    );
}
