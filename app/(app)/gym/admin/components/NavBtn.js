export default function NavBtn({ label, icon, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                width: '100%', padding: '12px',
                background: active ? '#222' : 'transparent',
                color: active ? '#fff' : '#888',
                border: 'none', borderRadius: '8px',
                cursor: 'pointer', textAlign: 'left',
                fontWeight: active ? 'bold' : 'normal',
                fontSize: '0.95rem'
            }}
        >
            <span>{icon}</span> {label}
        </button>
    );
}
