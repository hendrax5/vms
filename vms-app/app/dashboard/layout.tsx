'use client';

import { useState, useEffect } from 'react';
import { 
    LayoutDashboard, Users, Activity, Settings, 
    LogOut, Package, Network, LifeBuoy, ShieldAlert, Building2, Mail,
    Menu, X, PanelLeftClose, PanelLeftOpen, ChevronDown, Server
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navCategories = [
    {
        name: 'Dashboard & Tracker',
        items: [
            { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
            { label: 'Team Inbox', href: '/dashboard/inbox', icon: Mail, permission: 'tickets:view' },
            { label: 'Support Tickets', href: '/dashboard/tickets', icon: LifeBuoy, permission: 'tickets:view' },
            { label: 'Asset Tracker', href: '/dashboard/goods', icon: Package, permission: 'dashboard:view' }
        ]
    },
    {
        name: 'Datacenter Assets',
        items: [
            { label: 'Infrastructure Map', href: '/dashboard/infrastructure', icon: Building2, permission: 'infrastructure:view' },
            { label: 'Rack Management', href: '/dashboard/racks', icon: Package, permission: 'racks:manage' },
            { label: 'Asset Inventory', href: '/dashboard/assets', icon: Server, permission: 'infrastructure:view' },
            { label: 'Cross Connects', href: '/dashboard/cross-connects', icon: Network, permission: 'infrastructure:view' }
        ]
    },
    {
        name: 'Security & Access',
        items: [
            { label: 'Active Permits', href: '/dashboard/permits', icon: Users, permission: 'permits:view' },
            { label: 'Kiosk Security Panel', href: '/kiosk', icon: ShieldAlert, permission: 'permits:view' },
            { label: 'Security Center', href: '/dashboard/security', icon: ShieldAlert, permission: 'dashboard:view' }
        ]
    },
    {
        name: 'Administration',
        items: [
            { label: 'Tenant Management', href: '/dashboard/customers', icon: Users, permission: 'settings:manage' },
            { label: 'SLA Engine', href: '/dashboard/sla', icon: Activity, permission: 'sla:view' },
            { label: 'System Settings', href: '/dashboard/settings', icon: Settings, permission: 'settings:manage' }
        ]
    }
];

const customerNavCategories = [
    {
        name: 'General',
        items: [
            { label: 'Overview', href: '/dashboard', icon: LayoutDashboard, permission: 'dashboard:view' },
            { label: 'Support Tickets', href: '/dashboard/tickets', icon: LifeBuoy, permission: 'tickets:view' }
        ]
    },
    {
        name: 'Access & Logistics',
        items: [
            { label: 'Active Permits', href: '/dashboard/permits', icon: Users, permission: 'permits:view' },
            { label: 'Rack Management', href: '/dashboard/racks', icon: Package, permission: 'racks:manage' },
            { label: 'Cross Connects', href: '/dashboard/cross-connects', icon: Network, permission: 'infrastructure:view' },
            { label: 'Asset Tracker', href: '/dashboard/goods', icon: Package, permission: 'dashboard:view' }
        ]
    },
    {
        name: 'Administration',
        items: [
            { label: 'User Management', href: '/dashboard/settings', icon: Settings, permission: 'users:manage' }
        ]
    }
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const { data: session } = useSession();

    // Responsive states
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    const userRoleLower = ((session?.user as any)?.role || '').toLowerCase();
    const isCustomer = userRoleLower === 'customer' || userRoleLower.includes('tenant');

    // Auto-expand category based on current pathname
    useEffect(() => {
        const activeCat = (isCustomer ? customerNavCategories : navCategories).find(c => 
            c.items.some(i => i.href === pathname)
        );
        if (activeCat) setExpandedCategory(activeCat.name);
    }, [pathname, isCustomer]);

    const userPermissions = (session?.user as any)?.permissions || [];
    const userRoleRaw = (session?.user as any)?.role as string || '';
    const userName = session?.user?.name || 'Administrator';
    const userEmail = session?.user?.email || 'admin@vms.local';
    const isSuperAdmin = userRoleRaw.replace(/\s+/g, '').toLowerCase() === 'superadmin';
    
    // Always show if they are Super Admin, otherwise check permission presence.
    // If the user is a CUSTOMER, show them their specific allowed menus natively without granular NOC permission checks.

    return (
        <div className="min-h-[100dvh] bg-background flex selection:bg-emerald-500/30 overflow-x-hidden relative">
            {/* Mobile Overlay */}
            {isMobile && isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-background/80 z-40 backdrop-blur-md transition-all duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar Shell */}
            <aside 
                className={cn(
                    "bg-card border-r border-border/50 flex flex-col transition-all duration-300 ease-in-out z-50",
                    isMobile ? "fixed inset-y-0 left-0" : "relative h-[100dvh]",
                    isMobile && !isMobileMenuOpen ? "-translate-x-full" : "translate-x-0",
                    !isMobile && isCollapsed ? "w-[80px]" : "w-[280px]"
                )}
            >
                <div className="h-20 flex items-center justify-between px-6 border-b border-border/50 flex-shrink-0 flex-nowrap overflow-hidden">
                     <h2 className={cn(
                         "font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400 whitespace-nowrap transition-all",
                         isCollapsed && !isMobile ? "text-sm opacity-0 hidden" : "text-xl opacity-100 block"
                     )}>
                        VMS / DCIM
                     </h2>
                     {isCollapsed && !isMobile && (
                        <div className="w-full flex justify-center">
                            <ShieldAlert className="w-8 h-8 text-emerald-500" />
                        </div>
                     )}
                     
                     {/* Desktop Collapse Toggle */}
                     {!isMobile && (
                         <button 
                            onClick={() => setIsCollapsed(!isCollapsed)} 
                            className="text-slate-500 hover:text-slate-300 ml-auto hidden md:block flex-shrink-0"
                         >
                            {isCollapsed ? <PanelLeftOpen className="w-5 h-5 mx-auto" /> : <PanelLeftClose className="w-5 h-5" />}
                         </button>
                     )}
                     {/* Mobile Close Button */}
                     {isMobile && (
                         <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-white">
                             <X className="w-6 h-6" />
                         </button>
                     )}
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-4 space-y-6">
                     {(isCustomer ? customerNavCategories : navCategories).map((category, idx) => {
                         const visibleItems = category.items.filter(item => {
                             if (isSuperAdmin) return true;
                             if (isCustomer) {
                                 if (item.label === 'User Management') {
                                     return userRoleLower.includes('admin');
                                 }
                                 return true;
                             }
                             return userPermissions.includes(item.permission);
                         });

                         if (visibleItems.length === 0) return null;

                         return (
                             <div key={idx} className="space-y-1">
                                 <div 
                                     className="mb-2 px-2 flex-shrink-0 flex items-center justify-between cursor-pointer group"
                                     onClick={() => {
                                         if (!isCollapsed || isMobile) {
                                            setExpandedCategory(expandedCategory === category.name ? null : category.name);
                                         }
                                     }}
                                 >
                                     <p className={cn(
                                         "text-[11px] font-bold text-slate-500 uppercase tracking-widest transition-opacity duration-200",
                                         isCollapsed && !isMobile ? "opacity-0 w-0 h-0" : "opacity-100"
                                     )}>
                                         {category.name}
                                     </p>
                                     {(!isCollapsed || isMobile) && (
                                         <ChevronDown className={cn("w-3 h-3 text-slate-500 transition-transform group-hover:text-slate-300", expandedCategory === category.name ? "rotate-180" : "")} />
                                     )}
                                     {isCollapsed && !isMobile && <div className="h-px bg-slate-800 w-full mt-2" />}
                                 </div>
                                 
                                 <div className={cn(
                                    "space-y-1 overflow-hidden transition-all duration-300 ease-in-out",
                                     (!isCollapsed || isMobile) ? (expandedCategory === category.name ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0") : "max-h-[1000px] opacity-100"
                                 )}>
                                     {visibleItems.map((item) => {
                                         const Icon = item.icon;
                                         const isActive = pathname === item.href;
                                         return (
                                             <Link key={item.href} href={item.href} title={item.label}
                                                 className={cn(
                                                 "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group flex-wrap overflow-hidden flex-shrink-0",
                                                 isActive 
                                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner" 
                                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200",
                                                isCollapsed && !isMobile && "justify-center"
                                             )}>
                                             <Icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-emerald-400" : "text-slate-500 group-hover:text-slate-300")} />
                                             {(!isCollapsed || isMobile) && <span className="whitespace-nowrap">{item.label}</span>}
                                         </Link>
                                     )
                                     })}
                                 </div>
                             </div>
                         );
                     })}
                </div>
                
                {/* User Info & Sign Out Footer */}
                <div className="p-4 border-t border-border/50 flex flex-col gap-3">
                    <div className={cn(
                        "flex items-center gap-3 px-2 py-2 overflow-hidden",
                         isCollapsed && !isMobile ? "justify-center" : ""
                    )}>
                         <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-bold shadow-lg ring-2 ring-white/10 text-white">
                            {userName ? userName.charAt(0).toUpperCase() : 'A'}
                         </div>
                         {(!isCollapsed || isMobile) && (
                             <div className="flex flex-col whitespace-nowrap overflow-hidden">
                                 <p className="text-sm font-bold text-slate-200 truncate">{userName}</p>
                                 <p className="text-[11px] text-slate-500 truncate">{userEmail}</p>
                             </div>
                         )}
                    </div>
                    <button 
                        onClick={() => signOut({ callbackUrl: `${window.location.origin}/login` })} 
                        className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0 overflow-hidden",
                            isCollapsed && !isMobile && "justify-center"
                        )}
                        title="Sign Out"
                    >
                        <LogOut className="w-5 h-5 text-red-400/80 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && <span>Sign Out</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 h-[100dvh] overflow-y-auto">
                <header className="h-20 border-b border-border/50 w-full flex items-center px-6 lg:px-8 bg-card/50 backdrop-blur-md sticky top-0 z-10 flex-shrink-0">
                     {/* Mobile Hamburger Trigger */}
                     {isMobile && (
                         <button onClick={() => setIsMobileMenuOpen(true)} className="mr-4 text-slate-300 hover:text-white">
                             <Menu className="w-6 h-6" />
                         </button>
                     )}
                     
                     <div className="text-sm text-muted-foreground flex items-center gap-2">
                         <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider text-slate-300">
                             {session?.user?.role as string || 'GUEST'}
                         </span>
                         Regional Site: <span className="text-white font-semibold ml-1">Jakarta East (JKT-1)</span>
                     </div>
                     <div className="flex items-center gap-4 ml-auto">
                        <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Session ID</span>
                            <p className="text-xs text-emerald-400">VMS-{session?.user?.id?.slice(0, 6) || 'ONLINE'}</p>
                        </div>
                     </div>
                </header>

                <div className="flex-1 w-full p-4 lg:p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
