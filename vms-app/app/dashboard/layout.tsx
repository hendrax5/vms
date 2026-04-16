'use client';

import { 
    LayoutDashboard, Users, Activity, Settings, 
    LogOut, Package, Network, LifeBuoy, ShieldAlert, Building2, Mail
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
    { label: 'Team Inbox', href: '/dashboard/inbox', icon: Mail, permission: 'tickets:view' },
    { label: 'Infrastructure Map', href: '/dashboard/infrastructure', icon: Building2, permission: 'infrastructure:view' },
    { label: 'Tenant Management', href: '/dashboard/customers', icon: Users, permission: 'settings:manage' },
    { label: 'Active Permits', href: '/dashboard/permits', icon: Users, permission: 'permits:view' },
    { label: 'Rack Logistics', href: '/dashboard/racks', icon: Package, permission: 'racks:manage' },
    { label: 'Cross Connects', href: '/dashboard/cross-connects', icon: Network, permission: 'infrastructure:view' },
    { label: 'Goods & Assets', href: '/dashboard/goods', icon: Package, permission: 'dashboard:view' },
    { label: 'SLA Engine', href: '/dashboard/sla', icon: Activity, permission: 'sla:view' },
    { label: 'Security', href: '/dashboard/security', icon: ShieldAlert, permission: 'dashboard:view' },
    { label: 'Support Tickets', href: '/dashboard/tickets', icon: LifeBuoy, permission: 'tickets:view' },
    { label: 'Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings:manage' },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();

    const userPermissions = (session?.user as any)?.permissions || [];
    const userRoleRaw = (session?.user as any)?.role as string || '';
    const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
    const isCustomer = userRoleRaw.toLowerCase() === 'customer';
    
    // Always show if they are Super Admin, otherwise check permission presence.
    // If the user is a CUSTOMER, show them their specific allowed menus natively without granular NOC permission checks.
    
    const customerNavItems = [
        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
        { label: 'Active Permits', href: '/dashboard/permits', icon: Users, permission: 'permits:view' },
        { label: 'Cross Connects', href: '/dashboard/cross-connects', icon: Network, permission: 'infrastructure:view' },
        { label: 'Goods & Assets', href: '/dashboard/goods', icon: Package, permission: 'dashboard:view' },
        { label: 'Support Tickets', href: '/dashboard/tickets', icon: LifeBuoy, permission: 'tickets:view' },
    ];

    const visibleNavItems = isCustomer 
        ? customerNavItems 
        : navItems.filter(item => 
            isSuperAdmin || userPermissions.includes(item.permission)
        );

    return (
        <div className="min-h-screen bg-background flex selection:bg-blue-500/30">
            {/* Sidebar Shell */}
            <aside className="w-[280px] bg-card border-r border-border/50 hidden md:flex flex-col">
                <div className="h-20 flex items-center px-6 border-b border-border/50">
                     <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        VMS / DCIM
                     </h2>
                </div>
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
                     <div className="mb-4 px-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main Navigation</p>
                     </div>
                     {visibleNavItems.map((item) => {
                         const Icon = item.icon;
                         const isActive = pathname === item.href;
                         return (
                             <Link key={item.href} href={item.href}
                                 className={cn(
                                     "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                     isActive 
                                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner" 
                                        : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
                                 )}>
                                 <Icon className={cn("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                                 {item.label}
                             </Link>
                         )
                     })}
                </div>
                <div className="p-4 border-t border-border/50">
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut className="w-5 h-5 text-red-400/80" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center">
                <header className="h-20 border-b border-border/50 w-full flex items-center px-8 bg-card/50 backdrop-blur-md sticky top-0 z-10 justify-between">
                     <div className="text-sm text-muted-foreground flex items-center gap-2">
                         <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider text-slate-300">
                             {session?.user?.role as string || 'GUEST'}
                         </span>
                         Regional Site: <span className="text-white font-semibold ml-1">Jakarta East (JKT-1)</span>
                     </div>
                     <div className="flex items-center gap-4">
                         <div className="text-right mr-2 hidden md:block">
                             <p className="text-sm font-bold text-slate-200 leading-none">{session?.user?.name || 'Administrator'}</p>
                             <p className="text-xs text-slate-500 mt-1.5">{session?.user?.email || 'admin@vms.local'}</p>
                         </div>
                         <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white/10 text-white">
                            {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : 'A'}
                         </div>
                     </div>
                </header>

                <div className="flex-1 w-full p-8 overflow-y-auto max-w-[1600px]">
                    {children}
                </div>
            </main>
        </div>
    );
}
