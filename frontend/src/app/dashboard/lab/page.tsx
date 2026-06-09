'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TestTube2, Clock, Activity, CheckCircle2, Upload } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getApiUrl, getSocketUrl } from '@/lib/api';

const PRIORITY_COLORS: Record<string, string> = {
  CODE_RED: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
};

export default function LabDashboard() {
  const [labs, setLabs] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [resultsModal, setResultsModal] = useState<any>(null);
  const [assigningRoomFor, setAssigningRoomFor] = useState<string | null>(null);
  const [resultText, setResultText] = useState('');

  const fetchLabs = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/labs`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setLabs(Array.isArray(data) ? data : []);
    } catch { setLabs([]); }
  }, []);

  const fetchRooms = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      // Only show lab rooms that are OPEN
      setRooms(Array.isArray(data) ? data.filter((r: any) => r.department?.name?.toLowerCase().includes('lab') && r.status === 'OPEN') : []);
    } catch { setRooms([]); }
  }, []);

  useEffect(() => {
    fetchLabs();
    fetchRooms();
    const socket = io(getSocketUrl());
    socket.on('LAB_REQUEST_CREATED', fetchLabs);
    socket.on('LAB_UPDATED', fetchLabs);
    socket.on('ROOM_UPDATED', fetchRooms);
    return () => { socket.disconnect(); };
  }, [fetchLabs, fetchRooms]);

  const updateLab = async (id: string, status: string, results?: string, roomId?: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${getApiUrl()}/api/labs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, ...(results ? { results } : {}), ...(roomId ? { roomId } : {}) }),
    });
    toast.success(`Lab request marked as ${status}`);
    setResultsModal(null);
    setAssigningRoomFor(null);
    setResultText('');
    fetchLabs();
  };

  const pending = labs.filter(l => l.status === 'PENDING');
  const processing = labs.filter(l => l.status === 'PROCESSING');
  const completed = labs.filter(l => l.status === 'COMPLETED');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center">
          <TestTube2 className="mr-2.5 h-6 w-6 md:h-7 md:w-7 text-blue-600" />Laboratory Queue
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">Priority-ranked sample processing and results management.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Pending', value: pending.length, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Processing', value: processing.length, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed Today', value: completed.length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 font-medium">{s.label}</p>
              <p className={`text-2xl md:text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
            <div className={`h-10 w-10 md:h-11 md:w-11 rounded-xl flex items-center justify-center ${s.bg}`}>
              <s.icon className={`w-4 h-4 md:w-5 md:h-5 ${s.color}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {['Patient', 'Test Type', 'Priority', 'Status', 'Actions'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {labs.length === 0 && (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">No lab requests yet.</td></tr>
            )}
            {labs.map((lab, i) => (
              <motion.tr key={lab.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                  {lab.queue?.patient?.firstName} {lab.queue?.patient?.lastName}
                  <p className="text-[10px] text-slate-400 font-normal mt-0.5">{lab.queue?.patient?.queueRef}</p>
                </td>
                <td className="px-5 py-4 text-sm text-slate-700">
                  {lab.testType}
                  {lab.queue?.room && (
                    <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mt-1">
                      <Activity className="w-3 h-3" /> {lab.queue.room.name}
                    </p>
                  )}
                </td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${PRIORITY_COLORS[lab.queue?.priority] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                    {lab.queue?.priority?.replace('_', ' ') || 'N/A'}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm">
                  <span className={`flex items-center gap-1.5 font-medium ${lab.status === 'COMPLETED' ? 'text-green-600' : lab.status === 'PROCESSING' ? 'text-blue-600' : 'text-slate-500'}`}>
                    {lab.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                    {lab.status === 'PROCESSING' && <Activity className="w-3.5 h-3.5" />}
                    {lab.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {lab.status}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm">
                  <div className="flex gap-2 min-w-[150px]">
                    {lab.status === 'PENDING' && (
                      assigningRoomFor === lab.id ? (
                        <select 
                          className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                          onChange={(e) => updateLab(lab.id, 'PROCESSING', undefined, e.target.value)}
                          value=""
                        >
                          <option value="" disabled>Select Station...</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                          <option value="SKIP">Skip Room Assignment</option>
                        </select>
                      ) : (
                        <button onClick={() => setAssigningRoomFor(lab.id)} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-colors">
                          Start Process
                        </button>
                      )
                    )}
                    {lab.status === 'PROCESSING' && (
                      <button onClick={() => { setResultsModal(lab); setResultText(''); }} className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-1">
                        <Upload className="w-3 h-3" />Results
                      </button>
                    )}
                    {lab.status === 'COMPLETED' && lab.results && (
                      <span className="text-xs text-slate-500 italic truncate max-w-[150px]">{lab.results}</span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Results Modal */}
      {resultsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Upload Lab Results</h3>
            <p className="text-sm text-slate-500 mb-4">{resultsModal.testType} — {resultsModal.queue?.patient?.firstName} {resultsModal.queue?.patient?.lastName}</p>
            <textarea
              value={resultText}
              onChange={e => setResultText(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4"
              rows={4}
              placeholder="Enter lab result details..."
            />
            <div className="flex gap-3">
              <button onClick={() => setResultsModal(null)} className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={() => updateLab(resultsModal.id, 'COMPLETED', resultText)} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">Submit Results</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
