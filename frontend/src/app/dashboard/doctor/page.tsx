'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Clock, TestTube2, AlertTriangle, ChevronRight, Send, User, BedDouble, X, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getApiUrl, getSocketUrl } from '@/lib/api';

const PRIORITY_COLORS: Record<string, string> = {
  CODE_RED: 'bg-red-100 text-red-800 border-red-200',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW:      'bg-green-100 text-green-800 border-green-200',
};

export default function DoctorDashboard() {
  const [queues, setQueues]         = useState<any[]>([]);
  const [selectedQueue, setSelectedQueue] = useState<any>(null);
  const [vitals, setVitals] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [labType, setLabType] = useState('BLOOD_TEST');
  const [labModal, setLabModal]     = useState(false);
  const [assignRoomModal, setAssignRoomModal] = useState(false);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFilterDept, setRoomFilterDept] = useState('ALL');
  const [testType, setTestType]     = useState('Complete Blood Count (CBC)');
  const [notes, setNotes]           = useState('');

  const fetchQueues = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const [qRes, rRes] = await Promise.all([
        fetch(`${getApiUrl()}/api/queues`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${getApiUrl()}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (qRes.ok) setQueues(await qRes.json());
      if (rRes.ok) setRooms(await rRes.json());
    } catch {}
  }, []);

  const fetchVitals = useCallback(async (queueId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/vitals/${queueId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setVitals(await res.json());
      else setVitals(null);
    } catch { setVitals(null); }
  }, []);

  useEffect(() => {
    fetchQueues();
    const socket = io(getSocketUrl());
    socket.on('QUEUE_UPDATED', () => {
      fetchQueues();
      if (selectedQueue) fetchVitals(selectedQueue.id);
    });
    return () => { socket.disconnect(); };
  }, [fetchQueues]);

  const updateStatus = async (id: string, status: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${getApiUrl()}/api/queues/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    toast.success(`Status → ${status.replace(/_/g, ' ')}`);
  };

  const sendToLab = async () => {
    if (!selectedQueue) return;
    const token = localStorage.getItem('token');
    const user  = JSON.parse(localStorage.getItem('user') || '{}');
    try {
      await fetch(`${getApiUrl()}/api/labs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          queueId: selectedQueue.id,
          testType,
          notes,
          requestedBy: user.name,
          roomId: selectedRoomId || undefined
        }),
      });
      toast.success(`${testType} sent to Lab`);
      setLabModal(false);
      setSelectedRoomId('');
      setNotes('');
      fetchQueues();
    } catch {
      toast.error('Failed to send lab request');
    }
  };

  const assignRoom = async (roomId: string) => {
    if (!selectedQueue) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/queues/${selectedQueue.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'ROOM_ASSIGNED', roomId }),
      });
      if (res.ok) {
        toast.success('Room assigned successfully');
        setAssignRoomModal(false);
        fetchQueues();
      } else {
        toast.error('Failed to assign room');
      }
    } catch {
      toast.error('Failed to assign room');
    }
  };

  const myPatients = queues.filter(q => q.status !== 'WAITING' && q.status !== 'COMPLETED');
  const waiting = queues.filter(q => q.status === 'WAITING');

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center">
          <Stethoscope className="mr-2.5 h-6 w-6 md:h-7 md:w-7 text-blue-600" />
          Doctor Panel
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">
          Manage consultations, lab requests, and patient status.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        {[
          { label: 'My Active Patients', value: myPatients.length,                              color: 'text-blue-600'   },
          { label: 'Awaiting Consultation', value: waiting.length,                              color: 'text-orange-600' },
          { label: 'Critical Alerts',      value: queues.filter(q => q.priority === 'CODE_RED').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-sm text-slate-500 font-medium">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Patients */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Active Patients</h2>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {myPatients.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {myPatients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                <Stethoscope className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                No active patients
              </div>
            ) : myPatients.map((q, i) => (
              <motion.div
                key={q.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => {
                  setSelectedQueue(q);
                  fetchVitals(q.id);
                }}
                className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedQueue?.id === q.id ? 'bg-blue-50/60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">
                      {q.patient?.firstName} {q.patient?.lastName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[q.priority]}`}>
                        {q.priority?.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center">
                        <Clock className="w-3 h-3 mr-1" />{q.estimatedWait}m
                      </span>
                      <span className="text-xs text-slate-400">{q.status?.replace(/_/g, ' ')}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">
              {selectedQueue
                ? `${selectedQueue.patient?.firstName} ${selectedQueue.patient?.lastName}`
                : 'Select a Patient'}
            </h2>
          </div>
          {selectedQueue ? (
            <div className="p-5 space-y-4">
               {/* Vitals Display */}
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                 {[
                   { label: 'BP', value: vitals?.bp || '--', unit: '' },
                   { label: 'Temp', value: vitals?.temp || '--', unit: '°C' },
                   { label: 'HR', value: vitals?.heartRate || '--', unit: 'bpm' },
                   { label: 'Oxygen', value: vitals?.oxygen || '--', unit: '%' },
                 ].map(v => (
                   <div key={v.label} className="bg-white border border-slate-100 p-2 rounded-xl text-center shadow-sm">
                     <p className="text-[10px] font-bold text-slate-400 uppercase">{v.label}</p>
                     <p className="text-sm font-bold text-slate-800">{v.value}{v.unit}</p>
                   </div>
                 ))}
               </div>

               <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 border border-slate-100">
                {[
                  ['Ref',    selectedQueue.patient?.queueRef],
                  ['Status', selectedQueue.status?.replace(/_/g, ' ')],
                  ['Dept',   selectedQueue.department?.name],
                  ['Wait',   `${selectedQueue.estimatedWait} min`],
                  ['DOB',    selectedQueue.patient?.dob?.slice(0,10)],
                  ['Gender', selectedQueue.patient?.gender],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-500">{k}</span>
                    <span className="font-medium text-slate-900">{v || '—'}</span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateStatus(selectedQueue.id, 'IN_CONSULTATION')}
                  className="py-2.5 px-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Start Consultation
                </button>
                <button
                  onClick={() => updateStatus(selectedQueue.id, 'TREATMENT_ONGOING')}
                  className="py-2.5 px-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                >
                  Start Treatment
                </button>
                <button
                  onClick={() => setAssignRoomModal(true)}
                  className="py-2.5 px-3 bg-teal-500 text-white text-sm font-medium rounded-xl hover:bg-teal-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <BedDouble className="w-4 h-4" />Assign Room
                </button>
                <button
                  onClick={() => setLabModal(true)}
                  className="py-2.5 px-3 bg-yellow-500 text-white text-sm font-medium rounded-xl hover:bg-yellow-600 transition-colors flex items-center justify-center gap-1.5"
                >
                  <TestTube2 className="w-4 h-4" />Send to Lab
                </button>
                <button
                  onClick={() => updateStatus(selectedQueue.id, 'READY_FOR_DISCHARGE')}
                  className="col-span-2 py-2.5 px-3 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition-colors"
                >
                  Ready to Discharge
                </button>
              </div>
              <button
                onClick={() => { updateStatus(selectedQueue.id, 'COMPLETED'); setSelectedQueue(null); }}
                className="w-full py-2.5 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
              >
                ✓ Mark Completed
              </button>
            </div>
          ) : (
            <div className="py-16 text-center text-slate-400 text-sm">
              <User className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              Click a patient card to see actions
            </div>
          )}
        </div>
      </div>

      {/* Waiting Queue */}
      <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h2 className="font-semibold text-slate-900">Queue — Awaiting Doctor</h2>
          <span className="ml-auto text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
            {waiting.length} waiting
          </span>
        </div>
        {waiting.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">No patients waiting</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {waiting.map((q) => (
              <div
                key={q.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[q.priority]}`}>
                    {q.priority?.replace('_', ' ')}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {q.patient?.firstName} {q.patient?.lastName}
                    </p>
                    <p className="text-xs text-slate-400">{q.department?.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 flex items-center">
                    <Clock className="w-3 h-3 mr-1" />{q.estimatedWait}m
                  </span>
                  <button
                    onClick={() => { setSelectedQueue(q); updateStatus(q.id, 'IN_CONSULTATION'); }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg font-medium hover:bg-blue-700 transition-colors"
                  >
                    Take Patient
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lab Request Modal */}
      {labModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
          >
            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
              <TestTube2 className="mr-2 text-blue-600" />Send to Laboratory
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Test Type</label>
                <select
                  value={testType}
                  onChange={e => setTestType(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option>Complete Blood Count (CBC)</option>
                  <option>Lipid Panel</option>
                  <option>Urinalysis</option>
                  <option>Blood Glucose</option>
                  <option>Liver Function Test</option>
                  <option>Chest X-Ray</option>
                  <option>ECG / EKG</option>
                  <option>CT Scan</option>
                  <option>MRI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Assign to Laboratory / Room</label>
                <select
                  value={selectedRoomId}
                  onChange={e => setSelectedRoomId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Select Target Facility...</option>
                  {rooms.filter(r => r.status === 'OPEN').map(r => (
                    <option key={r.id} value={r.id}>{r.name} ({r.department?.name})</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">Leave empty to use general queue.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1.5">Clinical Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Notes for the lab technician..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setLabModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendToLab}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />Send to Lab
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Assign Room Modal */}
      {assignRoomModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900">Assign Room</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedQueue?.patient?.firstName} {selectedQueue?.patient?.lastName} → select room
                </p>
              </div>
              <button onClick={() => setAssignRoomModal(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={roomSearch}
                  onChange={e => setRoomSearch(e.target.value)}
                  placeholder="Search room name..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <select
                value={roomFilterDept}
                onChange={e => setRoomFilterDept(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              >
                <option value="ALL">All Departments</option>
                {Array.from(new Set(rooms.filter(r => r.status === 'OPEN' || r.status === 'CLEANING').map(r => r.department?.name).filter(Boolean))).map(d => (
                  <option key={d as string} value={d as string}>{d as string}</option>
                ))}
              </select>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-y-auto bg-slate-50">
              {rooms
                .filter(r => r.status === 'OPEN' || r.status === 'CLEANING')
                .filter(r => roomFilterDept === 'ALL' || r.department?.name === roomFilterDept)
                .filter(r => !roomSearch || r.name.toLowerCase().includes(roomSearch.toLowerCase()))
                .map(room => (
                  <button
                    key={room.id}
                    onClick={() => assignRoom(room.id)}
                    className="w-full flex items-center justify-between text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-teal-400 hover:bg-teal-50 transition-all group shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-sm text-slate-800 group-hover:text-teal-700">{room.name}</p>
                      <p className="text-[10px] text-slate-400 tracking-wide">{room.department?.name}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${room.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {room.status}
                    </span>
                  </button>
                ))
              }
              {rooms
                .filter(r => r.status === 'OPEN' || r.status === 'CLEANING')
                .filter(r => roomFilterDept === 'ALL' || r.department?.name === roomFilterDept)
                .filter(r => !roomSearch || r.name.toLowerCase().includes(roomSearch.toLowerCase())).length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm">No rooms match your search.</div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
