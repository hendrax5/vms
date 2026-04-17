'use client';

import { useState, useEffect, Suspense } from 'react';
import { User, Bell, Shield, Key, Save, Lock, Network, Mail, Trash2, Activity } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import InterconnectionProviders from './InterconnectionProviders';
import DatacenterMailSettings from './DatacenterMailSettings';

export default function SettingsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading settings...</div>}>
            <SettingsContent />
        </Suspense>
    );
}

function SettingsContent() {
    const { data: session } = useSession();
    const [loading, setLoading] = useState(false);
    const searchParams = useSearchParams();
    const initialTab = searchParams.get('tab') || 'account';
    const [activeTab, setActiveTab] = useState(initialTab);

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
        else setActiveTab('account');
    }, [searchParams]);

    // RBAC States
    const [roles, setRoles] = useState<any[]>([]);
    const [systemPermissions, setSystemPermissions] = useState<any[]>([]);
    const [rbacLoading, setRbacLoading] = useState(false);

    // Users States
    const [users, setUsers] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
    const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: '', roleId: '', customerId: '' });

    const [isCreateRoleModalOpen, setIsCreateRoleModalOpen] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');
    const [isCreatePermissionModalOpen, setIsCreatePermissionModalOpen] = useState(false);
    const [newPermissionForm, setNewPermissionForm] = useState({ key: '', label: '', group: 'Custom' });

    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editUserForm, setEditUserForm] = useState<{ id: number, roleId: string, explicitPermissions: string[], password?: string, customerId: string }>({ id: 0, roleId: '', explicitPermissions: [], password: '', customerId: '' });

    // Profile State
    const [profileForm, setProfileForm] = useState({ name: '', email: '', password: '' });

    useEffect(() => {
        if (session?.user) {
            setProfileForm(prev => ({
                ...prev,
                name: session.user.name || '',
                email: session.user.email || ''
            }));
        }
    }, [session]);

    // Activity Logs States
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Access Cards States
    const [accessCards, setAccessCards] = useState<any[]>([]);
    const [cardsLoading, setCardsLoading] = useState(false);
    const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
    const [newCardNumber, setNewCardNumber] = useState('');

    useEffect(() => {
        if (activeTab === 'rbac') {
            loadRbacData();
        } else if (activeTab === 'users') {
            loadUsersData();
            if (roles.length === 0) loadRbacData(); // Need roles for the creation dropdown
        } else if (activeTab === 'activity') {
            loadAuditLogs();
        } else if (activeTab === 'access-cards') {
            loadAccessCards();
        }
    }, [activeTab]);

    const loadAccessCards = async () => {
        setCardsLoading(true);
        try {
            const res = await fetch('/api/access-cards');
            const data = await res.json();
            setAccessCards(data || []);
        } catch (error) {
            console.error('Failed to load access cards', error);
        }
        setCardsLoading(false);
    };

    const handleAddAccessCard = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/access-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cardNumber: newCardNumber })
            });
            if (res.ok) {
                setIsAddCardModalOpen(false);
                setNewCardNumber('');
                loadAccessCards();
                toast.success('Access card added successfully');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to add access card');
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleDeleteAccessCard = async (id: number) => {
        if (!confirm('Are you sure you want to delete this access card?')) return;
        try {
            const res = await fetch(`/api/access-cards/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadAccessCards();
                toast.success('Access card deleted successfully');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete access card');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const loadAuditLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await fetch('/api/audit-logs?limit=50');
            const data = await res.json();
            if (data.success) {
                setAuditLogs(data.logs || []);
            }
        } catch (error) {
            console.error('Failed to load audit logs', error);
        }
        setLogsLoading(false);
    };

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
            const [usersRes, customersRes] = await Promise.all([
                fetch('/api/users').then(r => r.json()),
                fetch('/api/customers').then(r => r.json())
            ]);
            if (!usersRes.error) setUsers(usersRes);
            if (!customersRes.error) setCustomers(customersRes);
        } catch (error) {
            console.error('Failed to load users or customers', error);
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
                setNewUserForm({ name: '', email: '', password: '', roleId: '', customerId: '' });
                loadUsersData();
                toast.success('User created successfully');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to create user');
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
                toast.success('User deleted successfully');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            const userId = (session?.user as any)?.id;
            if (!userId) {
                toast.error('Session error: User ID not found');
                setLoading(false);
                return;
            }

            const res = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: profileForm.name,
                    email: profileForm.email,
                    password: profileForm.password || undefined
                })
            });

            if (res.ok) {
                toast.success('Profile updated successfully! You may need to sign in again to see all changes.');
                setProfileForm(prev => ({ ...prev, password: '' })); // clear password field
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update profile');
            }
        } catch (error) {
            console.error(error);
            toast.error('Network error while updating profile');
        }
        setLoading(false);
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
                toast.error(data.error || 'Failed to update permissions');
            } else {
                toast.success('Permissions updated successfully!');
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create', name: newRoleName, permissions: [] })
            });
            if (res.ok) {
                setIsCreateRoleModalOpen(false);
                setNewRoleName('');
                loadRbacData();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleDeleteRole = async (roleId: number) => {
        if (!confirm('Are you sure you want to delete this role? Any users attached to this role will lose their access.')) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/roles/${roleId}`, { method: 'DELETE' });
            if (res.ok) {
                loadRbacData();
                toast.success('Role deleted successfully');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete role');
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleCreatePermission = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newPermissionForm)
            });
            if (res.ok) {
                setIsCreatePermissionModalOpen(false);
                setNewPermissionForm({ key: '', label: '', group: 'Custom' });
                loadRbacData();
            } else {
                const data = await res.json();
                alert(data.error);
            }
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    const handleDeletePermission = async (e: React.MouseEvent, id: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this permission? It will be removed from all roles.')) return;
        try {
            const res = await fetch(`/api/permissions/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadRbacData();
                toast.success('Permission deleted');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to delete');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`/api/users/${editUserForm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    roleId: editUserForm.roleId, 
                    permissions: editUserForm.explicitPermissions, 
                    password: editUserForm.password,
                    customerId: editUserForm.customerId
                })
            });
            if (res.ok) {
                setIsEditUserModalOpen(false);
                loadUsersData();
                toast.success('User updated successfully');
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to update user');
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

    const toggleUserExplicitPermission = (permissionKey: string) => {
        setEditUserForm(prev => {
            const hasPerm = prev.explicitPermissions.includes(permissionKey);
            const newPerms = hasPerm 
                ? prev.explicitPermissions.filter(p => p !== permissionKey)
                : [...prev.explicitPermissions, permissionKey];
            return { ...prev, explicitPermissions: newPerms };
        });
    };

    const groupedPermissions = systemPermissions.reduce<Record<string, any[]>>((acc, perm) => {
        acc[perm.group] = acc[perm.group] || [];
        acc[perm.group].push(perm);
        return acc;
    }, {});

    const userRoleRaw = (session?.user as any)?.role as string || '';
    const userRoleLower = userRoleRaw.replace(/\s+/g, '').toLowerCase();
    const isSuperAdmin = userRoleLower === 'superadmin';
    const isDatacenterStaff = ['superadmin', 'nocadmin', 'nocstaff'].includes(userRoleLower);
    const isTenantAdmin = userRoleLower.includes('admin') && userRoleLower.includes('tenant');
    const userPermissions = (session?.user as any)?.permissions || [];
    const canManageUsers = isSuperAdmin || isTenantAdmin || userPermissions.includes('users:manage');
    const sessionCustomerId = (session?.user as any)?.customerId;
    const availableRoles = sessionCustomerId ? roles.filter(r => r.name.toLowerCase().includes('tenant')) : roles;

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
                            onClick={() => setActiveTab('activity')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'activity' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Activity className="w-5 h-5" />
                            Activity Logs
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
                    {isSuperAdmin && (
                        <button 
                            onClick={() => setActiveTab('advanced')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'advanced' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Save className="w-5 h-5" />
                            Advanced
                        </button>
                    )}
                    {isDatacenterStaff && (
                        <button 
                            onClick={() => setActiveTab('access-cards')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === 'access-cards' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'}`}
                        >
                            <Key className="w-5 h-5" />
                            Access Cards
                        </button>
                    )}
                </div>

                {/* Main Content Area */}
                <div className="col-span-1 md:col-span-3 space-y-6">
                    {activeTab === 'advanced' && isSuperAdmin && (
                        <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                                <div className="w-12 h-12 bg-rose-500/20 text-rose-400 flex flex-col items-center justify-center rounded-full font-bold text-xl uppercase ring-2 ring-rose-500/30">
                                    <Save className="w-6 h-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-100 leading-tight">Database Migration</h2>
                                    <p className="text-xs text-slate-400">Export and import database for server migrations.</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="p-4 rounded-xl bg-slate-800/50 border border-border/50">
                                    <h3 className="text-sm font-semibold text-slate-200 mb-2">Export Database</h3>
                                    <p className="text-xs text-slate-400 mb-4">Download a full JSON backup of all tables. Use this file to migrate data to another server.</p>
                                    <button 
                                        disabled={loading}
                                        onClick={async () => {
                                            setLoading(true);
                                            try {
                                                const res = await fetch('/api/database/export');
                                                if (!res.ok) throw new Error('Export failed');
                                                const blob = await res.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const a = document.createElement('a');
                                                a.href = url;
                                                a.download = `vms_backup_${new Date().toISOString().slice(0,10)}.json`;
                                                document.body.appendChild(a);
                                                a.click();
                                                a.remove();
                                                toast.success('Database exported successfully!');
                                            } catch (e: any) {
                                                toast.error(e.message || 'Export error');
                                            }
                                            setLoading(false);
                                        }}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                                    >
                                        Download JSON
                                    </button>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-800/50 border border-border/50">
                                    <h3 className="text-sm font-semibold text-rose-400 mb-2">Import Database</h3>
                                    <p className="text-xs text-slate-400 mb-4">Upload a JSON backup to merge into the current server. Duplicates with the same IDs will be skipped.</p>
                                    <div className="flex items-center gap-4">
                                        <input 
                                            type="file" 
                                            accept=".json"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                if (!confirm('Are you sure you want to import this data? Existing data with matching unique IDs will be skipped.')) return;
                                                setLoading(true);
                                                try {
                                                    const text = await file.text();
                                                    const data = JSON.parse(text);
                                                    const res = await fetch('/api/database/import', {
                                                        method: 'POST',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify(data)
                                                    });
                                                    const result = await res.json();
                                                    if (res.ok) {
                                                        console.log('Import summary:', result.summary);
                                                        toast.success('Database imported successfully!');
                                                    } else {
                                                        toast.error(result.error || 'Import failed');
                                                    }
                                                } catch (err: any) {
                                                    toast.error('Failed to parse or upload JSON');
                                                }
                                                setLoading(false);
                                                e.target.value = ''; // reset
                                            }}
                                            className="block w-full max-w-sm text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-rose-500/10 file:text-rose-400 hover:file:bg-rose-500/20 transition-all cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'mail' && (
                        <DatacenterMailSettings />
                    )}

                    {activeTab === 'providers' && (
                        <InterconnectionProviders />
                    )}

                    {activeTab === 'account' && (
                        <>
                            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                                    <div className="w-12 h-12 bg-blue-500/20 text-blue-400 flex flex-col items-center justify-center rounded-full font-bold text-xl uppercase ring-2 ring-blue-500/30">
                                        {(profileForm.name || 'U').charAt(0)}
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-100 leading-tight">Personal Information</h2>
                                        <p className="text-xs text-slate-400">Update your account details</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">Full Name</label>
                                            <input 
                                                type="text" 
                                                value={profileForm.name}
                                                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                                                placeholder="Your full name"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">Email Address</label>
                                            <input 
                                                type="email" 
                                                value={profileForm.email}
                                                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                                placeholder="your.email@example.com"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">New Password (optional)</label>
                                            <input 
                                                type="password" 
                                                value={profileForm.password}
                                                onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                                                placeholder="Leave blank to keep current password"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-slate-400">Assigned Role</label>
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
                            <div className="bg-gradient-to-r from-indigo-500/10 to-transparent border border-indigo-500/20 rounded-2xl p-6 backdrop-blur-xl mb-6 flex justify-between items-center">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                                        <Lock className="w-5 h-5 text-indigo-400" /> Granular Access Control
                                    </h2>
                                    <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                                        Assign specific read/write permissions to roles. These settings will immediately take effect for all users grouped under the respective role on their next session validation.
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => setIsCreatePermissionModalOpen(true)}
                                        className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-slate-900/20"
                                    >
                                        Add Permission
                                    </button>
                                    <button 
                                        onClick={() => setIsCreateRoleModalOpen(true)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-indigo-600/20"
                                    >
                                        Create Role
                                    </button>
                                </div>
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
                                                <div className="flex items-center gap-2 flex-col sm:flex-row">
                                                    <button 
                                                        onClick={() => handleDeleteRole(role.id)}
                                                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-lg border border-red-500/10 transition-colors"
                                                        title="Delete Role"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleSaveRole(role.id, role.permissions)}
                                                        disabled={loading}
                                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 border border-indigo-500/20 rounded-lg text-sm font-semibold transition-all"
                                                    >
                                                        {loading ? 'Saving...' : 'Save Configuration'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                                {Object.entries(groupedPermissions).map(([group, perms]: [string, any[]]) => (
                                                    <div key={group} className="space-y-3">
                                                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800 pb-2">{group}</h4>
                                                        <div className="space-y-2">
                                                            {perms.map(perm => {
                                                                const isChecked = role.permissions.includes(perm.key);
                                                                return (
                                                                    <label key={perm.id} className="flex items-start justify-between cursor-pointer group hover:bg-slate-800/30 p-2 rounded-lg -mx-2 transition-colors">
                                                                        <div className="flex items-start gap-3">
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
                                                                        </div>
                                                                        <button 
                                                                            onClick={(e) => handleDeletePermission(e, perm.id)}
                                                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-neutral-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-all self-center"
                                                                            title="Delete Permission"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </button>
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

                            {isCreateRoleModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">
                                        <h3 className="text-xl font-bold text-white mb-4">Create New Role</h3>
                                        <form onSubmit={handleCreateRole} className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Role Name <span className="text-red-400">*</span></label>
                                                <input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-700" placeholder="e.g. NOC Trainee"
                                                    value={newRoleName} onChange={e => setNewRoleName(e.target.value)} />
                                            </div>
                                            <div className="mt-6 flex justify-end gap-3">
                                                <button type="button" onClick={() => setIsCreateRoleModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                                                <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {isCreatePermissionModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">
                                        <h3 className="text-xl font-bold text-white mb-4">Create New Permission</h3>
                                        <form onSubmit={handleCreatePermission} className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Permission Group <span className="text-red-400">*</span></label>
                                                <input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-700" placeholder="e.g. System"
                                                    value={newPermissionForm.group} onChange={e => setNewPermissionForm({...newPermissionForm, group: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Permission Key (e.g. system:view) <span className="text-red-400">*</span></label>
                                                <input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-700" placeholder="e.g. system:manage"
                                                    value={newPermissionForm.key} onChange={e => setNewPermissionForm({...newPermissionForm, key: e.target.value})} />
                                            </div>
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Display Label <span className="text-red-400">*</span></label>
                                                <input type="text" required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-700" placeholder="e.g. Manage System Elements"
                                                    value={newPermissionForm.label} onChange={e => setNewPermissionForm({...newPermissionForm, label: e.target.value})} />
                                            </div>
                                            <div className="mt-6 flex justify-end gap-3">
                                                <button type="button" onClick={() => setIsCreatePermissionModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                                                <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save</button>
                                            </div>
                                        </form>
                                    </div>
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
                                                    <th className="px-4 py-3">Tenant</th>
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
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded text-xs font-medium">
                                                                {u.customer?.name || 'Internal'}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right space-x-4">
                                                            <button onClick={() => {
                                                                setEditUserForm({
                                                                    id: u.id,
                                                                    roleId: u.roleId?.toString() || '',
                                                                    explicitPermissions: u.explicitPermissions || [],
                                                                    password: '',
                                                                    customerId: u.customerId?.toString() || ''
                                                                });
                                                                setIsEditUserModalOpen(true);
                                                            }} className="text-indigo-400 hover:underline">Edit</button>
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
                                                    {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>
                                            {!sessionCustomerId && (
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1">Assign to Tenant</label>
                                                    <p className="text-xs text-slate-500 mb-2">Leave blank for Internal/NOC users.</p>
                                                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                        value={newUserForm.customerId} onChange={e => setNewUserForm({...newUserForm, customerId: e.target.value})}>
                                                        <option value="">No Tenant (Internal)</option>
                                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            )}
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

                            {/* Edit User Modal */}
                            {isEditUserModalOpen && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                                        <h3 className="text-xl font-bold text-white mb-4">Edit User Access</h3>
                                        <form onSubmit={handleUpdateUser} className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">System Role <span className="text-red-400">*</span></label>
                                                <p className="text-xs text-slate-500 mb-2">Changing the role updates the user's core permissions.</p>
                                                <select required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                    value={editUserForm.roleId} onChange={e => setEditUserForm({...editUserForm, roleId: e.target.value})}>
                                                    <option value="">Select Role</option>
                                                    {availableRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                                </select>
                                            </div>

                                            {!sessionCustomerId && (
                                                <div>
                                                    <label className="block text-sm text-slate-400 mb-1">Assign to Tenant</label>
                                                    <p className="text-xs text-slate-500 mb-2">Assign this user to a customer company.</p>
                                                    <select className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                        value={editUserForm.customerId} onChange={e => setEditUserForm({...editUserForm, customerId: e.target.value})}>
                                                        <option value="">No Tenant (Internal)</option>
                                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                    </select>
                                                </div>
                                            )}

                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Update Password</label>
                                                <p className="text-xs text-slate-500 mb-2">Leave blank to keep current password.</p>
                                                <input type="password" placeholder="New password" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white"
                                                    value={editUserForm.password || ''} onChange={e => setEditUserForm({...editUserForm, password: e.target.value})} />
                                            </div>

                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Explicit User Permissions</label>
                                                <p className="text-xs text-slate-500 mb-4">Assign specific permissions to this account that override or extend their base Role.</p>
                                                
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-950 p-4 rounded-lg border border-slate-800">
                                                    {Object.entries(groupedPermissions).map(([group, perms]: [string, any[]]) => (
                                                        <div key={group} className="space-y-2">
                                                            <h4 className="text-xs font-bold uppercase tracking-widest text-slate-600 pb-1 border-b border-slate-800">{group}</h4>
                                                            <div className="space-y-2 mt-2">
                                                                {perms.map(perm => {
                                                                    const isChecked = editUserForm.explicitPermissions.includes(perm.key);
                                                                    return (
                                                                        <label key={perm.id} className="flex items-start gap-3 cursor-pointer group">
                                                                            <div className="mt-1 relative flex items-center justify-center">
                                                                                <input 
                                                                                    type="checkbox" 
                                                                                    className="sr-only" 
                                                                                    checked={isChecked}
                                                                                    onChange={() => toggleUserExplicitPermission(perm.key)}
                                                                                />
                                                                                <div className={`w-4 h-4 rounded border ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-900 border-slate-700 group-hover:border-slate-500'} flex items-center justify-center transition-colors`}>
                                                                                    {isChecked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <p className={`text-xs font-medium ${isChecked ? 'text-slate-200' : 'text-slate-400'}`}>{perm.label}</p>
                                                                            </div>
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-slate-800">
                                                <button type="button" onClick={() => setIsEditUserModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                                                <button type="submit" disabled={loading} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">Save Changes</button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'activity' && (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5 overflow-hidden pointer-events-none">
                                <Activity className="w-64 h-64 text-amber-500 transform rotate-12" />
                            </div>

                            <div className="relative z-10 space-y-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                                        <Activity className="w-6 h-6 text-amber-500" />
                                        Activity & Audit Logs
                                    </h2>
                                    <p className="text-slate-400 mt-1">Review recent administrative actions performed within the system.</p>
                                </div>

                                {logsLoading ? (
                                    <div className="text-center text-slate-400 py-12">Loading logs...</div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
                                        <table className="w-full text-left text-sm text-slate-300">
                                            <thead className="bg-slate-900 text-slate-400 border-b border-slate-800">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Timestamp</th>
                                                    <th className="px-4 py-3 font-medium">User</th>
                                                    <th className="px-4 py-3 font-medium">IP Address</th>
                                                    <th className="px-4 py-3 font-medium">Action</th>
                                                    <th className="px-4 py-3 font-medium">Resource</th>
                                                    <th className="px-4 py-3 font-medium">Details</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {auditLogs.map((log: any) => (
                                                    <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                                                        <td className="px-4 py-3">
                                                            {log.user ? (
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium text-slate-200">{log.user.name}</span>
                                                                    <span className="text-xs text-slate-500">{log.user.email}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-500 italic">System / Unknown</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{log.ipAddress || '-'}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">{log.resource || '-'}</td>
                                                        <td className="px-4 py-3 font-mono text-xs text-slate-400 max-w-xs truncate" title={log.details}>
                                                            {log.details || '-'}
                                                        </td>
                                                    </tr>
                                                ))}
                                                {auditLogs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="text-center py-6 text-slate-500">No activity logs found.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    {activeTab === 'access-cards' && isDatacenterStaff && (
                        <div className="space-y-6">
                            <div className="bg-card/40 border border-border/50 rounded-2xl p-6 backdrop-blur-xl">
                                <div className="flex justify-between items-center mb-6 border-b border-border/50 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-full">
                                            <Key className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-slate-100">Access Card Database</h2>
                                            <p className="text-xs text-slate-400">Manage physical cards available for visitor check-in.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setIsAddCardModalOpen(true)}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
                                    >
                                        Register New Card
                                    </button>
                                </div>

                                {cardsLoading ? (
                                    <div className="text-center text-slate-500 py-12">Loading cards...</div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {accessCards.map((card) => (
                                            <div key={card.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-10 rounded-full ${card.status === 'Available' ? 'bg-emerald-500' : card.status === 'InUse' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-200">{card.cardNumber}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] uppercase font-bold ${card.status === 'Available' ? 'text-emerald-500' : card.status === 'InUse' ? 'text-amber-500' : 'text-red-500'}`}>
                                                                {card.status}
                                                            </span>
                                                            {card.currentPermit && (
                                                                <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                                                                    - PRM-{card.currentPermit.id}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteAccessCard(card.id)}
                                                    className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                    title="Delete Card"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {accessCards.length === 0 && (
                                            <div className="col-span-full py-12 text-center bg-slate-950/50 rounded-xl border border-dashed border-slate-800">
                                                <Key className="w-12 h-12 text-slate-800 mx-auto mb-3" />
                                                <p className="text-slate-500">No access cards registered.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Add Card Modal */}
                            {isAddCardModalOpen && (
                                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 flex items-center justify-center rounded-full">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                            <h3 className="text-xl font-bold text-white">Register New Card</h3>
                                        </div>
                                        <form onSubmit={handleAddAccessCard} className="space-y-4">
                                            <div>
                                                <label className="block text-sm text-slate-400 mb-1">Card Serial / Number <span className="text-red-400">*</span></label>
                                                <input 
                                                    type="text" 
                                                    required 
                                                    autoFocus
                                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-700 font-mono" 
                                                    placeholder="e.g. VISITOR-001"
                                                    value={newCardNumber} 
                                                    onChange={e => setNewCardNumber(e.target.value.toUpperCase())} 
                                                />
                                            </div>
                                            <div className="pt-4 flex justify-end gap-3">
                                                <button type="button" onClick={() => setIsAddCardModalOpen(false)} className="px-4 py-2 text-slate-300">Cancel</button>
                                                <button type="submit" disabled={loading} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-shadow shadow-lg shadow-indigo-600/20">
                                                    {loading ? 'Registering...' : 'Register Card'}
                                                </button>
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
