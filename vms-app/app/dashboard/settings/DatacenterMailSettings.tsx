'use client';

import { useState, useEffect } from 'react';
import { Mail, Save, AlertCircle } from 'lucide-react';

export default function DatacenterMailSettings() {
    const [config, setConfig] = useState<any>({
        isActive: true,
        imapHost: '', imapPort: 993, imapUser: '', imapPass: '',
        smtpHost: '', smtpPort: 465, smtpUser: '', smtpPass: '',
        notificationTriggers: []
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/settings/mail');
            const data = await res.json();
            if (data.config) {
                setConfig(data.config);
            }
        } catch (e) {
            console.error('Failed to load mail settings');
        }
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/mail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            const data = await res.json();
            if (res.ok) {
                setToast({ msg: 'Mail Integration Settings Saved', type: 'success' });
            } else {
                setToast({ msg: data.error || 'Failed to save', type: 'error' });
            }
        } catch (e: any) {
            setToast({ msg: e.message, type: 'error' });
        }
        setTimeout(() => setToast(null), 3000);
        setSaving(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl p-6 backdrop-blur-xl mb-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <Mail className="w-5 h-5 text-emerald-400" /> NOC Shared Inbox Configuration
                </h2>
                <p className="text-slate-400 mt-2 text-sm max-w-2xl">
                    Configure the IMAP and SMTP endpoints for your Datacenter. The Mail Worker will actively sync incoming tickets and replies into the Dashboard. 
                </p>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="bg-card/30 border border-border/50 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-200">Integration Toggle</h3>
                            <p className="text-xs text-slate-500">Enable or disable background sync.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="sr-only peer" 
                                checked={config.isActive} 
                                onChange={e => setConfig({...config, isActive: e.target.checked})}
                            />
                            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-border/50">
                        {/* IMAP */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">IMAP Receiver (Incoming)</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">IMAP Host</label>
                                    <input type="text" value={config.imapHost} onChange={e => setConfig({...config, imapHost: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" placeholder="imap.example.com" />
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Port</label>
                                    <input type="number" value={config.imapPort} onChange={e => setConfig({...config, imapPort: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">IMAP Username</label>
                                <input type="text" value={config.imapUser} onChange={e => setConfig({...config, imapUser: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" placeholder="noc@vms.local" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">IMAP Password</label>
                                <input type="password" value={config.imapPass} onChange={e => setConfig({...config, imapPass: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" placeholder="••••••••" />
                            </div>
                        </div>

                        {/* SMTP */}
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">SMTP Sender (Outgoing)</h4>
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">SMTP Host</label>
                                    <input type="text" value={config.smtpHost} onChange={e => setConfig({...config, smtpHost: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" placeholder="smtp.example.com" />
                                </div>
                                <div className="col-span-1 space-y-1">
                                    <label className="text-xs text-slate-400 font-medium">Port</label>
                                    <input type="number" value={config.smtpPort} onChange={e => setConfig({...config, smtpPort: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">SMTP Username</label>
                                <input type="text" value={config.smtpUser} onChange={e => setConfig({...config, smtpUser: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" placeholder="noc@vms.local" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">SMTP Password</label>
                                <input type="password" value={config.smtpPass} onChange={e => setConfig({...config, smtpPass: e.target.value})} className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200" placeholder="••••••••" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border/50 space-y-4">
                        <h4 className="text-sm font-bold uppercase tracking-widest text-slate-500">Email Notification Triggers</h4>
                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                            <div>
                                <p className="text-sm font-medium text-slate-200">Send QR Code when Permit is Approved</p>
                                <p className="text-xs text-slate-500">Automatically emails a copy of the QR code token to the requesting user's contact email.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer" 
                                    checked={config.notificationTriggers?.includes('permit_approved')} 
                                    onChange={e => {
                                        const triggers = config.notificationTriggers || [];
                                        if (e.target.checked) {
                                            setConfig({...config, notificationTriggers: [...triggers, 'permit_approved']});
                                        } else {
                                            setConfig({...config, notificationTriggers: triggers.filter((t: string) => t !== 'permit_approved')});
                                        }
                                    }}
                                />
                                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-between items-center pt-4 border-t border-border/50">
                        <div>
                            {toast && (
                                <div className={`flex items-center gap-2 text-sm ${toast.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
                                    <AlertCircle className="w-4 h-4" /> {toast.msg}
                                </div>
                            )}
                        </div>
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-500/20"
                        >
                            {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Integration</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
