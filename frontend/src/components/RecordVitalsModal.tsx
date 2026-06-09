'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Thermometer, Wind, Weight, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { getApiUrl } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  queue: any;
  onSuccess: () => void;
}

export default function RecordVitalsModal({ open, onClose, queue, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bp: '', temp: '', heartRate: '', oxygen: '', weight: '', notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          queueId: queue.id,
          bp: form.bp,
          temp: form.temp ? parseFloat(form.temp) : undefined,
          heartRate: form.heartRate ? parseInt(form.heartRate) : undefined,
          oxygen: form.oxygen ? parseInt(form.oxygen) : undefined,
          weight: form.weight ? parseFloat(form.weight) : undefined,
          notes: form.notes
        }),
      });
      if (!res.ok) throw new Error('Failed to record vitals');
      toast.success('Vitals recorded successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Could not save vitals');
    } finally {
      setLoading(false);
    }
  };

  if (!queue) return null;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Activity className="text-blue-400" /> Record Vitals
                </h3>
                <p className="text-slate-400 text-xs mt-1">Patient: {queue.patient?.firstName} {queue.patient?.lastName}</p>
              </div>
              <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Blood Pressure</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    placeholder="120/80" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.bp} onChange={e => setForm({...form, bp: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Temperature (°C)</label>
                <div className="relative">
                  <Thermometer className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" step="0.1" placeholder="36.5" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.temp} onChange={e => setForm({...form, temp: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Heart Rate (BPM)</label>
                <div className="relative">
                  <Activity className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" placeholder="72" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.heartRate} onChange={e => setForm({...form, heartRate: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Oxygen (SpO2 %)</label>
                <div className="relative">
                  <Wind className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="number" placeholder="98" 
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.oxygen} onChange={e => setForm({...form, oxygen: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Nurse Notes</label>
                <div className="relative">
                  <ClipboardList className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <textarea 
                    placeholder="Any observations..." 
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                  />
                </div>
              </div>

              <div className="col-span-2 pt-4 flex gap-3">
                <button type="button" onClick={onClose} className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors">
                  Cancel
                </button>
                <button disabled={loading} type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
                  {loading ? 'Saving...' : 'Save Vitals'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
