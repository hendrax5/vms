'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Reply, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function TeamInboxClient() {
    const [emails, setEmails] = useState<any[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
    const [replyBody, setReplyBody] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [replySuccess, setReplySuccess] = useState(false);

    const fetchEmails = async () => {
        setIsRefreshing(true);
        try {
            const res = await fetch('/api/inbox');
            if (res.ok) {
                const data = await res.json();
                setEmails(data.emails || []);
            }
        } catch (e) {
            console.error('Failed to load inbox');
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEmails();
        const interval = setInterval(fetchEmails, 20000); // Polling every 20s
        return () => clearInterval(interval);
    }, []);

    const handleReply = async () => {
        if (!replyBody.trim() || !selectedEmail) return;
        setIsSending(true);
        try {
            const res = await fetch('/api/inbox/reply', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: selectedEmail.messageId,
                    replyBody
                })
            });
            if (res.ok) {
                setReplyBody('');
                setReplySuccess(true);
                setTimeout(() => setReplySuccess(false), 3000);
                fetchEmails(); // Refresh to update repliedAt flag
            } else {
                alert('Failed to send reply. Please check SMTP settings.');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-140px)] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            {/* Left Pane - List */}
            <div className="w-1/3 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                    <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-emerald-400" />
                        Team Inbox
                    </h2>
                    <button 
                        onClick={fetchEmails} 
                        className={`p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto w-full">
                    {emails.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">Wait for sync...</div>
                    ) : emails.map(email => (
                        <div 
                            key={email.id} 
                            onClick={() => setSelectedEmail(email)}
                            className={`p-4 border-b border-slate-800/50 cursor-pointer transition-all ${selectedEmail?.id === email.id ? 'bg-emerald-900/20 border-l-4 border-l-emerald-500 text-white' : 'hover:bg-slate-800/50 text-slate-300'}`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className="font-semibold text-sm truncate w-3/4" title={email.from}>{email.from}</span>
                                <span className="text-xs text-slate-500 whitespace-nowrap">
                                    {formatDistanceToNow(new Date(email.receivedAt), { addSuffix: true })}
                                </span>
                            </div>
                            <div className="font-medium text-sm mb-1 truncate text-slate-200">
                                {email.subject || '(No Subject)'}
                            </div>
                            <div className="text-xs text-slate-500 truncate">
                                {email.bodyText}
                            </div>
                            {email.repliedAt && (
                                <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                    <Reply className="w-3 h-3" />
                                    Replied
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Pane - Detail */}
            <div className="flex-1 bg-slate-950 flex flex-col">
                {selectedEmail ? (
                    <>
                        <div className="p-6 border-b border-slate-800 bg-slate-900">
                            <h1 className="text-2xl font-bold text-white mb-4">{selectedEmail.subject || '(No Subject)'}</h1>
                            <div className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="text-slate-400">From: <span className="text-slate-200 font-medium">{selectedEmail.from}</span></p>
                                    <p className="text-slate-400">To: <span className="text-slate-200">{selectedEmail.to}</span></p>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="w-4 h-4" />
                                    {new Date(selectedEmail.receivedAt).toLocaleString()}
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 text-slate-300 custom-scrollbar">
                            {/* Rich rendering if HTML exists, else plain text */}
                            <div className="prose prose-invert max-w-none break-words" 
                                dangerouslySetInnerHTML={{ __html: selectedEmail.htmlContent || selectedEmail.bodyText.replace(/\n/g, '<br/>') }} 
                            />
                        </div>

                        {/* Reply Box */}
                        <div className="p-4 border-t border-slate-800 bg-slate-900">
                            <div className="relative">
                                <textarea
                                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-32"
                                    placeholder="Write a reply..."
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                ></textarea>
                                <div className="absolute bottom-4 right-4 flex items-center gap-3">
                                    {replySuccess && (
                                        <span className="text-emerald-400 text-sm flex items-center gap-1 font-medium animate-pulse">
                                            <CheckCircle2 className="w-4 h-4" /> Sent
                                        </span>
                                    )}
                                    <button 
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                        onClick={handleReply}
                                        disabled={isSending || !replyBody.trim()}
                                    >
                                        <Reply className="w-4 h-4" />
                                        {isSending ? 'Sending...' : 'Send Reply'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                        <Mail className="w-16 h-16 mb-4 opacity-20" />
                        <p>Select a message to read</p>
                    </div>
                )}
            </div>
        </div>
    );
}
