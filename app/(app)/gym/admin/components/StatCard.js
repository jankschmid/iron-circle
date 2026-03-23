export default function StatCard({ label, value, icon, highlight, note }) {
    return (
        <div style={{
            background: '#111', padding: '24px', borderRadius: '16px', border: '1px solid #222',
            boxShadow: highlight ? '0 0 20px rgba(255, 200, 0, 0.1)' : 'none'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>{label}</div>
                <div style={{ fontSize: '1.2rem' }}>{icon}</div>
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: highlight ? '#FFC800' : '#fff' }}>
                {value}
            </div>
            {note && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>{note}</div>}
        </div>
    );
}
