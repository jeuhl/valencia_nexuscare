'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onPatientAdded: () => void;
}

const PRIORITIES = [
  { value: 'CODE_RED', label: '🔴 Code Red — Critical', color: 'border-red-300 bg-red-50 text-red-800' },
  { value: 'HIGH',     label: '🟠 High Priority',       color: 'border-orange-300 bg-orange-50 text-orange-800' },
  { value: 'MEDIUM',   label: '🟡 Medium Priority',     color: 'border-yellow-300 bg-yellow-50 text-yellow-800' },
  { value: 'LOW',      label: '🟢 Low / Stable',        color: 'border-green-300 bg-green-50 text-green-800' },
];

import { getApiUrl } from '@/lib/api';

export default function AddPatientModal({ open, onClose, onPatientAdded }: Props) {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', gender: 'Male',
    contactPhone: '', departmentId: '', priority: 'MEDIUM',
  });

  useEffect(() => {
    if (!open) return;
    const token = localStorage.getItem('token');
    fetch(`${getApiUrl()}/api/departments`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [open]);

  const set = (field: string, value: string) => setForm(p => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to register patient');
      toast.success(`Patient ${data.patient.firstName} registered — Ref: ${data.patient.queueRef}`);
      onPatientAdded();
      onClose();
      setForm({ firstName: '', lastName: '', dob: '', gender: 'Male', contactPhone: '', departmentId: '', priority: 'MEDIUM' });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Register New Patient</h2>
                  <p className="text-xs text-slate-400">Adds patient to the queue immediately</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">First Name *</label>
                  <input
                    required value={form.firstName}
                    onChange={e => set('firstName', e.target.value)}
                    placeholder="John"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Last Name *</label>
                  <input
                    required value={form.lastName}
                    onChange={e => set('lastName', e.target.value)}
                    placeholder="Doe"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              {/* DOB & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Date of Birth *</label>
                  <input
                    required type="date" value={form.dob}
                    onChange={e => set('dob', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Gender *</label>
                  <select
                    value={form.gender} onChange={e => set('gender', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Contact Phone</label>
                <input
                  value={form.contactPhone}
                  onChange={e => set('contactPhone', e.target.value)}
                  placeholder="+63 900 000 0000"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-2">Triage Priority *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRIORITIES.map(p => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => set('priority', p.value)}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border-2 transition-all text-left ${
                        form.priority === p.value ? p.color + ' ring-2 ring-offset-1 ring-blue-400' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.priority === 'CODE_RED' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-xs text-red-700 font-medium">Code Red will trigger an emergency notification to all staff.</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={onClose}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  {loading ? 'Registering...' : 'Register & Enqueue'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
