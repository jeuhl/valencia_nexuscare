'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Heart, Clock, BedDouble, Activity } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getApiUrl, getSocketUrl } from '@/lib/api';
import RecordVitalsModal from '@/components/RecordVitalsModal';

const PRIORITY_COLORS: Record<string, string> = {
  CODE_RED: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
};

export default function NurseDashboard() {
  const [queues, setQueues] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [assigningRoomFor, setAssigningRoomFor] = useState<string | null>(null);
  const [recordingVitalsFor, setRecordingVitalsFor] = useState<any>(null);

  const fetchQueues = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/queues`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setQueues(Array.isArray(data) ? data : []);
    } catch { setQueues([]); }
  }, []);

  const fetchRooms = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data.filter((r: any) => r.status === 'OPEN') : []);
    } catch { setRooms([]); }
  }, []);

  useEffect(() => {
    fetchQueues();
    fetchRooms();
    const socket = io(getSocketUrl());
    socket.on('QUEUE_UPDATED', fetchQueues);
    socket.on('ROOM_UPDATED', fetchRooms);
    return () => { socket.disconnect(); };
  }, [fetchQueues, fetchRooms]);

  const updateStatus = async (id: string, status: string, roomId?: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${getApiUrl()}/api/queues/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, roomId }),
    });
    toast.success(`Updated to ${status.replace(/_/g, ' ')}`);
    setAssigningRoomFor(null);
  };

  const waiting = queues.filter(q => q.status === 'WAITING');
  const vitals = queues.filter(q => q.status === 'VITALS_TAKEN');
  const assigned = queues.filter(q => q.status === 'ROOM_ASSIGNED');
  const readyForDischarge = queues.filter(q => q.status === 'READY_FOR_DISCHARGE');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center">
          <Heart className="mr-2.5 h-6 w-6 md:h-7 md:w-7 text-blue-600" />Nurse Station
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">Floor queue management, vitals intake, and room assignments.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'Awaiting Vitals', value: waiting.length, color: 'text-orange-600' },
          { label: 'Vitals Taken', value: vitals.length, color: 'text-blue-600' },
          { label: 'Room Assigned', value: assigned.length, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Floor Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: 'Waiting for Vitals', queues: waiting, action: 'VITALS_TAKEN', actionLabel: 'Record Vitals', color: 'border-orange-200' },
          { title: 'Vitals Taken', queues: vitals, action: 'ROOM_ASSIGNED', actionLabel: 'Assign Room', color: 'border-blue-200' },
          { title: 'Room Assigned', queues: assigned, action: 'IN_CONSULTATION', actionLabel: 'Send to Doctor', color: 'border-green-200' },
          { title: 'Ready for Discharge', queues: readyForDischarge, action: 'COMPLETED', actionLabel: 'Discharge Patient', color: 'border-purple-200' },
        ].map(col => (
          <div key={col.title} className={`bg-white rounded-2xl border ${col.color} shadow-sm overflow-hidden`}>
            <div className="px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-700">{col.title}</h3>
            </div>
            <div className="p-3 space-y-2 min-h-48">
              {col.queues.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-100 rounded-xl">Empty</div>
              )}
              {col.queues.map((q, i) => (
                <motion.div
                  key={q.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[q.priority]}`}>
                      {q.priority.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-slate-400 flex items-center"><Clock className="w-3 h-3 mr-0.5" />{q.estimatedWait}m</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-1">{q.patient?.firstName} {q.patient?.lastName}</p>
                  
                  {q.room && (
                    <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mb-2">
                      <BedDouble className="w-3 h-3" /> {q.room.name}
                    </p>
                  )}

                  {assigningRoomFor === q.id ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                      <select 
                        className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        onChange={(e) => updateStatus(q.id, 'ROOM_ASSIGNED', e.target.value)}
                        value=""
                      >
                        <option value="" disabled>Select Open Room...</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.id}>{r.name} ({r.department?.name})</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setAssigningRoomFor(null)}
                        className="w-full py-1 text-[10px] text-slate-500 hover:text-slate-700 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (col.action === 'ROOM_ASSIGNED') {
                          setAssigningRoomFor(q.id);
                        } else if (col.action === 'VITALS_TAKEN') {
                          setRecordingVitalsFor(q);
                        } else {
                          updateStatus(q.id, col.action);
                        }
                      }}
                      className="w-full py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
                    >
                      {col.actionLabel}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <RecordVitalsModal 
        open={!!recordingVitalsFor} 
        onClose={() => setRecordingVitalsFor(null)} 
        queue={recordingVitalsFor}
        onSuccess={fetchQueues}
      />
    </div>
  );
}
