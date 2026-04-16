'use client';
import { useState, useEffect } from 'react';
import { Plus, Ticket, Search, CheckCircle, Clock, AlertCircle, MessageSquare, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TicketsPage() {
    const { data: session } = useSession();
    const [tickets, setTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        subject: '',
        description: '',
        priority: 'Medium',
        category: 'General'
    });

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await fetch('/api/tickets');
            const data = await res.json();
            setTickets(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                reporterId: 1 // Default fallback for ticket reporter
            };
            const res = await fetch('/api/tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ subject: '', description: '', priority: 'Medium', category: 'General' });
                fetchTickets();
            }
        } catch (error) {
            console.error(error);
        }
    };

    const getPriorityColor = (p: string) => {
        if (p === 'Critical') return 'text-red-400 bg-red-500/10 border-red-500/20';
        if (p === 'High') return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
        if (p === 'Medium') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
        return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    };

    const getStatusIcon = (s: string) => {
        if (s === 'Resolved' || s === 'Closed') return <CheckCircle className="w-4 h-4 text-emerald-400" />;
        if (s === 'In Progress') return <Clock className="w-4 h-4 text-amber-400" />;
        return <AlertCircle className="w-4 h-4 text-blue-400" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
                <div>
                    <h1 className="text-3xl font-extrabold text-white">Support & SLA Tickets</h1>
                    <p className="text-muted-foreground mt-1">Manage infrastructure requests and service level logs</p>
                </div>
                <div className="flex gap-3">
                     <button onClick={fetchTickets} className="px-5 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-white rounded-lg text-sm font-semibold border border-white/5 transition-all">
                         Refresh
                     </button>
                    <button onClick={() => setIsModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 font-semibold shadow-[0_0_20px_-3px_rgba(99,102,241,0.4)] transition-all">
                        <Plus className="w-4 h-4" /> New Ticket
                    </button>
                </div>
            </div>
            
            <div className="bg-card/40 border border-white/5 rounded-2xl backdrop-blur-xl overflow-hidden">
                 <div className="p-4 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                    <h3 className="font-semibold text-slate-200">Active Requests</h3>
                    <div className="relative w-64">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                         <input 
                             type="text" 
                             placeholder="Search subjects..." 
                             className="w-full bg-slate-950/50 border border-white/10 text-sm text-slate-200 rounded-lg pl-10 pr-4 py-1.5 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                         />
                     </div>
                </div>

                <div className="divide-y divide-white/5">
                    {loading ? (
                         <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                             <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mb-4" />
                             Loading tickets...
                         </div>
                    ) : tickets.length === 0 ? (
                         <div className="p-12 text-center">
                             <Ticket className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                             <p className="text-slate-400 font-medium">No active tickets.</p>
                             <p className="text-slate-500 text-sm">System infrastructure is operating normally.</p>
                         </div>
                    ) : (
                        tickets.map((t, i) => (
                            <motion.div 
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={t.id} 
                                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-800/30 transition-colors gap-4"
                            >
                                <div className="flex items-start gap-4">
                                     <div className="mt-1">
                                         {getStatusIcon(t.status)}
                                     </div>
                                     <div>
                                         <p className="text-sm font-bold text-slate-200">{t.subject}</p>
                                         <p className="text-xs text-slate-500 mt-1 line-clamp-1">{t.description}</p>
                                         <div className="flex items-center gap-3 mt-2 text-xs">
                                             <span className="text-slate-400 font-mono">TKT-{t.id.toString().padStart(4, '0')}</span>
                                             <span className="text-slate-600">•</span>
                                             <span className="text-slate-400">{t.category}</span>
                                             <span className="text-slate-600">•</span>
                                             <span className="text-slate-400 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> 0 comments</span>
                                         </div>
                                     </div>
                                </div>
                                <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2">
                                     <span className={`px-2.5 py-1 rounded border text-xs font-semibold ${getPriorityColor(t.priority)}`}>
                                         {t.priority}
                                     </span>
                                     <span className="text-xs text-slate-400">
                                         {new Date(t.createdAt).toLocaleDateString()}
                                     </span>
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.95 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.95 }}
                            className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
                        >
                            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                                <h2 className="text-xl font-semibold text-white">Create Support Ticket</h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <form onSubmit={handleCreate} className="p-5 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Subject</label>
                                    <input 
                                        required
                                        type="text"
                                        value={formData.subject}
                                        onChange={e => setFormData({...formData, subject: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        placeholder="Brief summary of the issue..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                                    <select 
                                        value={formData.category}
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="General">General Inquiry</option>
                                        <option value="Cross-Connect">Cross-Connect</option>
                                        <option value="Hardware">Hardware / Rack</option>
                                        <option value="Power">Power & Cooling</option>
                                        <option value="Network">Routing / Network</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Priority</label>
                                    <select 
                                        value={formData.priority}
                                        onChange={e => setFormData({...formData, priority: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="Low">Low (No immediate impact)</option>
                                        <option value="Medium">Medium (Partial disruption)</option>
                                        <option value="High">High (Significant impact)</option>
                                        <option value="Critical">Critical (SLA breach / Outage)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                    <textarea 
                                        required
                                        value={formData.description}
                                        onChange={e => setFormData({...formData, description: e.target.value})}
                                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:ring-1 focus:ring-indigo-500 outline-none h-32 resize-none"
                                        placeholder="Describe the issue in detail..."
                                    />
                                </div>
                                <div className="pt-2 flex justify-end gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        type="submit"
                                        className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg"
                                    >
                                        Submit Ticket
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
