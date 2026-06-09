'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, Info, CheckCircle, Zap } from 'lucide-react';
import { io } from 'socket.io-client';
import toast, { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#fff',
          color: '#0f172a',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '12px 16px',
          fontSize: '14px',
        },
      }}
    />
  );
}

import { getApiUrl, getSocketUrl } from '@/lib/api';

type NotificationType = { id: string; title: string; message: string; type: string; read: boolean; createdAt: string };

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${getApiUrl()}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setNotifications(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchNotifications();
    const socket = io(getSocketUrl());
    socket.on('NOTIFICATION', (n: NotificationType) => {
      setNotifications(prev => [n, ...prev]);
      const icons: Record<string, string> = { EMERGENCY: '🚨', WARNING: '⚠️', SUCCESS: '✅', INFO: 'ℹ️' };
      toast(`${icons[n.type] || 'ℹ️'} ${n.title}: ${n.message}`, {
        style: n.type === 'EMERGENCY' ? { background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b' } : {},
      });
    });
    return () => { socket.disconnect(); };
  }, [fetchNotifications]);

  const markAllAsRead = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${getApiUrl()}/api/notifications/all/read-all`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${getApiUrl()}/api/notifications/all/clear`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    setNotifications([]);
  };

  const unread = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'EMERGENCY': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'WARNING': return <Zap className="w-4 h-4 text-orange-500" />;
      case 'SUCCESS': return <CheckCircle className="w-4 h-4 text-green-500" />;
      default: return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute right-0 top-12 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Notifications</h3>
              <div className="flex gap-2">
                <button onClick={markAllAsRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Mark Read</button>
                <button onClick={clearNotifications} className="text-xs text-red-600 hover:text-red-800 font-medium">Clear</button>
                <button onClick={() => setOpen(false)} className="ml-2 p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">No notifications yet</div>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}>
                    <div className="mt-0.5 shrink-0">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                    </div>
                    {!n.read && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
