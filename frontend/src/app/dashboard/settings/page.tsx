'use client';

import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
          <Settings className="mr-2.5 h-7 w-7 text-blue-600" />Settings
        </h1>
        <p className="text-slate-500 text-sm mt-1">System configuration and preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Your Account</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{user.name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-50">
              <span className="text-slate-500">Role</span><span className="font-medium text-slate-900">{user.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Session</span><span className="font-medium text-green-600">Active</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">System Info</h2>
          <div className="space-y-3 text-sm">
            {[
              { label: 'App Version', value: 'NexusCare Workflow v1.0' },
              { label: 'Backend', value: 'http://localhost:4000' },
              { label: 'Database', value: 'SQLite (local dev)' },
              { label: 'Real-time', value: 'Socket.IO WebSockets' },
            ].map(item => (
              <div key={item.label} className="flex justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-500">{item.label}</span>
                <span className="font-medium text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
