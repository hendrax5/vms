'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Shield, Key, Save, Lock, Network, Mail } from 'lucide-react';
import { useSession } from 'next-auth/react';
import InterconnectionProviders from './InterconnectionProviders';
import DatacenterMailSettings from './DatacenterMailSettings';

export default function SettingsPage() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('account');

    // RBAC States
    const [roles, setRoles] = useState<any[]>([]);
    const [systemPermissions, setSystemPermissions] = useState<any[]>([]);
    const [rbacLoading, setRbacLoading] = useState(false);

    // Users States
    const [users, setUsers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', roleId: '' });

    useEffect(() => {
        if (activeTab === 'rbac') {
            loadRbacData();
        } else if (activeTab === 'users') {
            loadUsersData();
            if (roles.length === 0) loadRbacData(); // Need roles for the creation dropdown
        }
    }, [activeTab]);

    const loadRbacData = async () => {
        setRbacLoading(true);
        try {
            const [rolesRes, permsRes] = await Promise.all([
                fetch('/api/roles').then(r => r.json()),
                fetch('/api/permissions').then(r => r.json())
            ]);
            setRoles(rolesRes || []);
            setSystemPermissions(permsRes || []);
        } catch (error) {
            console.error('Failed to load RBAC data', error);
        }
        setRbacLoading(false);
    };

    const loadUsersData = async () => {
        setUsersLoading(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (!data.error) setUsers(data);
        } catch (error) {
            console.error('Failed to load users', error);
        }
        setUsersLoading(false);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUserForm)
            });
            if (res.ok) {
                setIsAddUserModalOpen(false);
                setNewUserForm({ name: '', email: '', password: '', roleId: '' });
                loadUsersData();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;
        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadUsersData();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveProfile = () => {
        setLoading(true);
        setTimeout(() => setLoading(false), 800);
    };

    const handleSaveRole = async (roleId: number, currentPermissions: string[]) => {
        setLoading(true);
        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleId, permissions: currentPermissions })
            });
            if (!res.ok) {
                const data = await res.json();
                alert(data.error || 'Failed to update permissions');
            } else {
                alert('Permissions updated successfully!');
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const togglePermission = (roleId: number, permissionKey: string) => {
        setRoles(roles.map(r => {
            if (r.id === roleId) {
                const hasPerm = r.permissions.includes(permissionKey);
                const newPerms = hasPerm 
                    ? r.permissions.filter((p: string) => p !== permissionKey)
                    : [...r.permissions, permissionKey];
                return { ...r, permissions: newPerms };
            }
            return r;
        }));
    };

    const groupedPermissions = systemPermissions.reduce<Record<string, any[]>>((acc, perm) => {
        acc[perm.group] = acc[perm.group] || [];
        acc[perm.group].push(perm);
        return acc;
    }, {});

    const userRoleRaw = (session?.user as any)?.role as string || '';
    const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
    const userPermissions = (session?.user as any)?.permissions || [];
    const canManageUsers = isSuperAdmin || userPermissions.includes('users:manage');

    return (
        <div className="space-y-8 max-w-6xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-100">System Settings</h1>
                <p className="text-muted-foreground mt-1">Manage your account preferences and global system configurations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Sidebar Navigation */}
                <div className="col-span-1 space-y-2">
                    <button 
                        onClick={() => setActiveTab('account')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'account' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                    >
                        <User className="w-5 h-5" />
                        Account
                    </button>
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setActiveTab('rbac')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'rbac' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Shield className="w-5 h-5" />
                            Roles & Permissions
                        </button>
                    )}
                    {canManageUsers && (
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Lock className="w-5 h-5" />
                            User Management
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setActiveTab('providers')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'providers' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Network className="w-5 h-5" />
                            Interconnections
                        </button>
                    )}
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setActiveTab('mail')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'mail' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Mail className="w-5 h-5" />
                            Mail Integration
                        </button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="col-span-1 md:col-span-3 space-y-6">
                    {activeTab === 'mail' && (
                        <DatacenterMailSettings />
                    )}

                    {activeTab === 'providers' && (
                        <InterconnectionProviders />
                    )}

                    {activeTab === 'account' && (
                        <>
                            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                                <h2 className="text-lg font-bold text-slate-100 mb-4 border-b border-border/50 pb-4">Personal Information</h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">Full Name</label>
                                            <input 
                                                type="text" 
                                                defaultValue={session?.user?.name || ''}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">Email Address</label>
                                            <input 
                                                type="email" 
                                                defaultValue={session?.user?.email || ''}
                                                disabled
                                                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">Role</label>
                                            <input 
                                                type="text" 
                                                defaultValue={(session?.user as any)?.role || ''}
                                                disabled
                                                className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-4 py-2 text-slate-500 cursor-not-allowed uppercase text-xs font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button 
                                    onClick={handleSaveProfile}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-500/20"
                                >
                                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </>
                    )}

                    {activeTab === 'rbac' && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-xl mb-6">
                                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-indigo-400" /> Granular Access Control
                                </h2>
                                <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                                    Assign specific read/write permissions to roles. These settings will immediately take effect for all users grouped under the respective role on their next session validation.
                                </p>
                            </div>

                            {rbacLoading ? (
                                <div className="flex items-center justify-center p-12">
                                    <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {roles.filter(r => r.name !== 'Tenant').map(role => (
                                        <div key={role.id} className="bg-card/30 border border-border/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                                            <div className="px-6 py-4 bg-slate-900/50 flex items-center justify-between border-b border-border/50">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-200">{role.name}</h3>
                                                    <p className="text-xs text-slate-500">{role.permissions.length} permissions assigned</p>
                                                </div>
                                                <button 
                                                    onClick={() => handleSaveRole(role.id, role.permissions)}
                                                    disabled={loading}
                                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 border border-indigo-500/20 rounded-lg text-sm font-semibold transition-all"
                                                >
                                                    {loading ? 'Saving...' : 'Save Configuration'}
                                                </button>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {Object.entries(groupedPermissions).map(([group, perms]: [string, any[]]) => (
                                                    <div key={group} className="space-y-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">{group}</h4>
                                                        <div className="space-y-2">
                                                            {perms.map(perm => {
                                                                const isChecked = role.permissions.includes(perm.key);
                                                                return (
                                                                    <label key={perm.id} className="flex items-start gap-3 cursor-pointer group">
                                                                        <div className="mt-1 relative flex items-center justify-center">
                                                                            <input 
                                                                                type="checkbox" 
                                                                                className="sr-only" 
                                                                                checked={isChecked}
                                                                                onChange={() => togglePermission(role.id, perm.key)}
                                                                            />
                                                                            <div className={`w-5 h-5 rounded border ${isChecked ? 'bg-indigo-500 border-indigo-500' : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'} flex items-center justify-center transition-colors`}>
                                                                                {isChecked && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <p className={`text-sm font-medium ${isChecked ? 'text-slate-200' : 'text-slate-400'}`}>{perm.label}</p>
                                                                            <p className="text-xs text-slate-600 font-mono mt-0.5">{perm.key}</p>
                                                                        </div>
                                                                    </label>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'users' && (
                        <div className="space-y-6">
                            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-slate-100">User Directory</h2>
                                    <button 
                                        onClick={() => setIsAddUserModalOpen(true)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                    >
                                        Create User
                                    </button>
                                </div>
                                {usersLoading ? <div className="text-center text-slate-500 py-8">Loading users...</div> : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm text-slate-400">
                                            <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-b border-border/50">
                                                <tr>
                                                    <th className="px-4 py-3">Name</th>
                                                    <th className="px-4 py-3">Email</th>
                                                    <th className="px-4 py-3">Role</th>
                                                    <th className="px-4 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((u) => (
                                                    <tr key={u.id} className="border-b border-border/50 hover:bg-slate-900/30">
                                                        <td className="px-4 py-3 font-medium text-slate-200">{u.name || '-'}</td>
                                                        <td className="px-4 py-3">{u.email}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-slate-800 rounded text-xs font-mono">{u.role?.name || 'N/A'}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button onClick={() => handleDeleteUser(u.id)} className="text-red-400 hover:underline">Delete</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {users.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="text-center py-6">No users found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Add User Modal */}
                            {isAddUserModalOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">
                                        <h3 className="text-xl font-bold text-white mb-4">Create New User</h3>
                                        <form onSubmit={handleCreateUser} className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Name</label>
                                                <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                    value={newUserForm.name} onChange={e => setNewUserForm({...newUserForm, name: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Email <span className="text-red-400">*</span></label>
                                                <input type="email" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                    value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">System Role <span className="text-red-400">*</span></label>
                                                <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                    value={newUserForm.roleId} onChange={e => setNewUserForm({...newUserForm, roleId: e.target.value})}>
                                                    <option value="">Select Role</option>
                                                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Password</label>
                                                <input type="password" placeholder="Defaults to password123" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                    value={newUserForm.password} onChange={e => setNewUserForm({...newUserForm, password: e.target.value})} />
                                            </div>
                                            <div className="mt-6 flex justify-end gap-3">
                                                <button type="button" onClick={() => setIsAddUserModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                                                <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">Save</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
