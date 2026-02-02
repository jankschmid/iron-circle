"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function TeamSettings({ params }) {
    const { user } = useStore();
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [gymId, setGymId] = useState(null);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchEmail, setSearchEmail] = useState('');
    const [foundUser, setFoundUser] = useState(null);
    const [searchError, setSearchError] = useState(null);
    const [isSearching, setIsSearching] = useState(false);

    const supabase = createClient();

    // 1. Resolve Gym ID (from URL or Context)
    // This page is likely under /gym/[id]/admin/settings/team or similar?
    // User requested /gym/admin/settings/team, which implies global admin or dynamic route?
    // Let's assume it's /gym/[id]/settings/team based on typical structure, OR we get it from store (current gym).
    // The prompt said: "/gym/admin/settings/team". This path needs to know WHICH gym.
    // If it's a global admin dashboard, we need to pick a gym.
    // Assuming we use the `user.gymId` or `params.id` if this is a dynamic route.
    // Let's assume it's a dynamic route page [id]. If not, failure.
    // CHECK: User prompt said "/gym/admin/settings/team". That route seems static.
    // If static, we must assume the Admin is managing "Their Gym" (single owner?) or we pick the first admin gym.

    useEffect(() => {
        if (!user) return;
        // Try to find the gym where user is admin
        const adminGym = user.gyms?.find(g => g.role === 'admin' || g.role === 'owner');
        if (adminGym) {
            setGymId(adminGym.id);
            fetchStaff(adminGym.id);
        } else {
            // Not an admin
            // Redirect or show error
        }
    }, [user]);

    const fetchStaff = async (gid) => {
        setLoading(true);
        // Fetch users who have role 'admin' or 'trainer' in this gym
        const { data, error } = await supabase
            .from('user_gyms')
            .select('role, user_id, profiles(id, name, email, avatar_url, username)')
            .eq('gym_id', gid)
            .in('role', ['admin', 'trainer', 'owner']);

        if (error) {
            console.error("Error fetching staff:", error);
        } else {
            setStaff(data || []);
        }
        setLoading(false);
    };

    const handleSearch = async () => {
        if (!searchEmail) return;
        setIsSearching(true);
        setSearchError(null);
        setFoundUser(null);

        // Use the secure RPC
        const { data, error } = await supabase
            .rpc('find_gym_member_by_email', {
                p_gym_id: gymId,
                p_email: searchEmail.trim()
            });

        if (error) {
            setSearchError(error.message);
        } else if (data && data.length > 0) {
            setFoundUser(data[0]);
        } else {
            setSearchError("No member found with this exact email.");
        }
        setIsSearching(false);
    };

    const handlePromote = async (role) => {
        if (!foundUser || !gymId) return;

        const { error } = await supabase
            .rpc('update_gym_member_role', {
                p_gym_id: gymId,
                p_user_id: foundUser.id,
                p_role: role
            });

        if (error) {
            alert("Error updating role: " + error.message);
        } else {
            alert(`User promoted to ${role}!`);
            setIsModalOpen(false);
            setFoundUser(null);
            setSearchEmail('');
            fetchStaff(gymId);
        }
    };

    const handleRemoveRole = async (userId) => {
        if (!confirm("Remove this user from the team? They will become a regular member.")) return;

        const { error } = await supabase
            .rpc('update_gym_member_role', {
                p_gym_id: gymId,
                p_user_id: userId,
                p_role: 'member'
            });

        if (error) {
            alert("Error removing role: " + error.message);
        } else {
            fetchStaff(gymId);
        }
    };

    if (!user) return null;
    if (!gymId && !loading) return <div className="p-8">You do not have Admin access to any gym.</div>;

    return (
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Team Management</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Manage Admins and Trainers for your gym.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    style={{ background: 'var(--primary)', color: 'black', padding: '12px 24px', borderRadius: '100px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                    + Add Staff
                </button>
            </div>

            {/* Staff List */}
            <div style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                            <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Name</th>
                            <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Role</th>
                            <th style={{ padding: '16px', color: 'var(--text-muted)' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {staff.map((member) => (
                            <tr key={member.user_id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <img
                                        src={member.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.user_id}`}
                                        style={{ width: '40px', height: '40px', borderRadius: '50%' }}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{member.profiles?.name || 'Unknown'}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{member.profiles?.username || 'user'}</div>
                                    </div>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{
                                        padding: '4px 12px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold',
                                        background: member.role === 'admin' ? 'var(--primary)' : 'var(--secondary)',
                                        color: 'black'
                                    }}>
                                        {member.role.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    {member.user_id !== user.id && (
                                        <button
                                            onClick={() => handleRemoveRole(member.user_id)}
                                            style={{ color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}
                                        >
                                            Remove Role
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {staff.length === 0 && !loading && (
                            <tr>
                                <td colSpan="3" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>No staff members found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add Staff Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--surface)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', border: '1px solid var(--border)' }}>
                        <h3 style={{ marginBottom: '16px' }}>Add Team Member</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
                            Search for an existing gym member by their exact email address to promote them.
                        </p>

                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input
                                type="email"
                                placeholder="member@example.com"
                                value={searchEmail}
                                onChange={(e) => setSearchEmail(e.target.value)}
                                style={{ flex: 1, padding: '12px', background: 'var(--background)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }}
                            />
                            <button
                                onClick={handleSearch}
                                disabled={isSearching}
                                style={{ padding: '12px 20px', background: 'var(--surface-highlight)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white', cursor: 'pointer' }}
                            >
                                {isSearching ? '...' : 'Search'}
                            </button>
                        </div>

                        {searchError && (
                            <div style={{ color: 'var(--error)', marginBottom: '16px', fontSize: '0.9rem' }}>{searchError}</div>
                        )}

                        {foundUser && (
                            <div style={{ background: 'var(--background)', padding: '12px', borderRadius: '8px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid var(--success)' }}>
                                <img src={foundUser.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${foundUser.id}`} style={{ width: '40px', height: '40px', borderRadius: '50%' }} />
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{foundUser.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{foundUser.handle}</div>
                                </div>
                            </div>
                        )}

                        {foundUser ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                <button onClick={() => handlePromote('trainer')} style={{ padding: '12px', background: 'var(--secondary)', border: 'none', borderRadius: '8px', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>Make Trainer</button>
                                <button onClick={() => handlePromote('admin')} style={{ padding: '12px', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'black', fontWeight: 'bold', cursor: 'pointer' }}>Make Admin</button>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button onClick={() => setIsModalOpen(false)} style={{ padding: '12px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
