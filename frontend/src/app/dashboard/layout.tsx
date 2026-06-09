'use client';

import { Activity, Users, LayoutDashboard, Settings, LogOut, FileText, Stethoscope, BedDouble, BarChart3, UserCog, Heart, Menu, X, Brush, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { NotificationBell, ToastProvider } from '@/components/NotificationBell';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_ITEMS = [
  { href: '/dashboard',           label: 'Queue & Triage',  icon: LayoutDashboard, roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { href: '/dashboard/heatmap',   label: 'Flow Heatmap',    icon: Activity,        roles: ['ADMIN', 'DOCTOR', 'NURSE'] },
  { href: '/dashboard/doctor',    label: 'Doctor Panel',    icon: Stethoscope,     roles: ['ADMIN', 'DOCTOR'] },
  { href: '/dashboard/nurse',     label: 'Nurse Station',   icon: Heart,           roles: ['ADMIN', 'NURSE'] },
  { href: '/dashboard/lab',       label: 'Laboratory',      icon: FileText,        roles: ['ADMIN', 'LAB_STAFF', 'DOCTOR'] },
  { href: '/dashboard/cleaning',  label: 'Cleaning',        icon: Brush,           roles: ['ADMIN', 'CLEANING_STAFF'] },
  { href: '/dashboard/rooms',     label: 'Room Tracking',   icon: BedDouble,       roles: ['ADMIN', 'NURSE', 'CLEANING_STAFF'] },
  // { href: '/dashboard/patients',  label: 'Patients',        icon: Users,           roles: ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'] },
  { href: '/dashboard/admin',     label: 'Admin Panel',     icon: UserCog,         roles: ['ADMIN'] },
  { href: '/dashboard/settings',  label: 'Settings',        icon: Settings,        roles: ['ADMIN', 'DOCTOR', 'NURSE', 'LAB_STAFF'] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('night-mode');
    if (stored === 'true') {
      setIsNightMode(true);
      document.documentElement.classList.add('night-mode');
    }
  }, []);

  const toggleNightMode = () => {
    const newVal = !isNightMode;
    setIsNightMode(newVal);
    localStorage.setItem('night-mode', String(newVal));
    if (newVal) {
      document.documentElement.classList.add('night-mode');
    } else {
      document.documentElement.classList.remove('night-mode');
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/');
    } else {
      setUser(JSON.parse(storedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (!user) return null;

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex flex-col h-screen medical-bg text-slate-900 overflow-hidden relative">
      <ToastProvider />

      {/* Top Header */}
      <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 flex items-center justify-between px-4 md:px-6 shrink-0 z-40 relative">
        <div className="flex items-center gap-4">
          <div className="flex items-center mr-2 md:mr-6">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-md shadow-blue-500/30">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-500">NexusCare</span>
            </div>
          </div>
          <div className="text-sm text-slate-400 font-medium capitalize hidden md:block">
            {pathname.split('/').filter(Boolean).slice(-1)[0] || 'Dashboard'}
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden xs:flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold no-invert">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </div>
          <button
            onClick={toggleNightMode}
            className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Toggle Night Mode"
          >
            {isNightMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <NotificationBell />
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl text-red-500 hover:bg-red-50 transition-colors ml-1"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 items-center justify-center text-white font-bold text-sm ml-2">
            {user.name.charAt(0)}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1 overflow-auto bg-slate-50/50 pb-28">
        {children}
      </main>

      {/* Bottom Floating Navbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-fit mx-auto">
        <nav className="bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-2xl rounded-full p-1.5 flex items-center justify-center gap-1 sm:gap-1.5 overflow-x-auto overflow-y-hidden hide-scrollbar">
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`group flex items-center justify-center h-10 w-10 sm:h-12 sm:w-auto sm:px-4 rounded-full transition-all duration-300 shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                {isActive && <span className="hidden sm:block ml-2 text-sm font-semibold">{label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

