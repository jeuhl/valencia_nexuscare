'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, User, AlertCircle, CheckCircle2, Activity as ActivityIcon, Plus, BedDouble, ArrowRight, X, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import AddPatientModal from '@/components/AddPatientModal';
import { getApiUrl, getSocketUrl } from '@/lib/api';
import toast from 'react-hot-toast';

const COLUMNS = [
  'WAITING', 'VITALS_TAKEN', 'ROOM_ASSIGNED',
  'IN_CONSULTATION', 'SENT_TO_LAB', 'TREATMENT_ONGOING', 'READY_FOR_DISCHARGE',
];

const COLUMN_LABELS: Record<string, string> = {
  WAITING:              'Waiting',
  VITALS_TAKEN:         'Vitals Taken',
  ROOM_ASSIGNED:        'Room Assigned',
  IN_CONSULTATION:      'In Consultation',
  SENT_TO_LAB:          'Sent to Lab',
  TREATMENT_ONGOING:    'Treatment',
  READY_FOR_DISCHARGE:  'Ready for Discharge',
};

export default function DashboardPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [transferTarget, setTransferTarget] = useState<any | null>(null); // queue entry being transferred

  const fetchQueues = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/queues`);
      const data = await res.json();
      setQueues(Array.isArray(data) ? data : []);
    } catch (e) {
      setQueues([]);
    }
  }, []);

  const fetchDepts = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/departments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchQueues();
    fetchDepts();
    const socket = io(getSocketUrl());
    socket.on('QUEUE_UPDATED', (updatedQueue) => {
      setQueues(prev => {
        const exists = prev.find(q => q.id === updatedQueue.id);
        if (exists) {
          if (updatedQueue.status === 'COMPLETED') return prev.filter(q => q.id !== updatedQueue.id);
          return prev.map(q => q.id === updatedQueue.id ? updatedQueue : q);
        }
        return [...prev, updatedQueue];
      });
    });
    return () => { socket.disconnect(); };
  }, [fetchQueues, fetchDepts]);

  const token = () => localStorage.getItem('token');

  // Drag and Drop
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('queueId', id);
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const queueId = e.dataTransfer.getData('queueId');
    setQueues(prev => prev.map(q => q.id === queueId ? { ...q, status: newStatus } : q));
    try {
      await fetch(`${getApiUrl()}/api/queues/${queueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {
      fetchQueues();
    }
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  // Transfer patient to another department
  const transferDept = async (queueId: string, departmentId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/queues/${queueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: 'WAITING', departmentId }),
      });
      if (res.ok) {
        toast.success('Patient transferred to new department');
        setTransferTarget(null);
      } else {
        toast.error('Transfer failed');
      }
    } catch {
      toast.error('Transfer failed');
    }
  };

  // Assign Room
  const [assignRoomTarget, setAssignRoomTarget] = useState<any | null>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [roomSearch, setRoomSearch] = useState('');
  const [roomFilterDept, setRoomFilterDept] = useState('ALL');

  const fetchRooms = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms`, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch {}
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const assignRoom = async (queueId: string, roomId: string) => {
    try {
      const res = await fetch(`${getApiUrl()}/api/queues/${queueId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ status: 'ROOM_ASSIGNED', roomId }),
      });
      if (res.ok) {
        toast.success('Room assigned successfully');
        setAssignRoomTarget(null);
        fetchRooms();
      } else {
        toast.error('Failed to assign room');
      }
    } catch {
      toast.error('Failed to assign room');
    }
  };

  // Complete visit
  const completeVisit = async (queueId: string) => {
    await fetch(`${getApiUrl()}/api/queues/${queueId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ status: 'COMPLETED' }),
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CODE_RED': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH':     return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM':   return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW':      return 'bg-green-100 text-green-800 border-green-200';
      default:         return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Triage & Queue Hub</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time dynamic queue synchronization. Drag cards to update status.</p>
        </div>
        <button
          onClick={() => setShowAddPatient(true)}
          className="w-full sm:w-auto px-4 py-2.5 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <Plus className="h-4 w-4" /> Add Patient
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        {[
          { label: 'Waiting',            value: queues.filter(q => q.status === 'WAITING').length,              icon: Clock,         color: 'text-orange-500', bg: 'bg-orange-50' },
          { label: 'In Treatment',       value: queues.filter(q => q.status === 'TREATMENT_ONGOING').length,   icon: ActivityIcon,  color: 'text-blue-500',   bg: 'bg-blue-50' },
          { label: 'Ready for Discharge',value: queues.filter(q => q.status === 'READY_FOR_DISCHARGE').length, icon: CheckCircle2,  color: 'text-green-500',  bg: 'bg-green-50' },
          { label: 'Critical / Red',     value: queues.filter(q => q.priority === 'CODE_RED').length,          icon: AlertCircle,   color: 'text-red-500',    bg: 'bg-red-50' },
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-500">{stat.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
            </div>
            <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Queue Board */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 md:p-6 overflow-x-auto">
        <h2 className="text-lg font-semibold text-slate-900 mb-5">Live Workflow</h2>
        <div className="flex gap-4 min-w-max">
          {COLUMNS.map((statusColumn) => (
            <div
              key={statusColumn}
              className="bg-slate-50 rounded-xl p-4 w-68 border border-slate-100 shrink-0 min-h-[500px]"
              style={{ width: '264px' }}
              onDrop={(e) => handleDrop(e, statusColumn)}
              onDragOver={allowDrop}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  {COLUMN_LABELS[statusColumn]}
                </h3>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-600 rounded-full px-2 py-0.5">
                  {queues.filter(q => q.status === statusColumn).length}
                </span>
              </div>
              <div className="space-y-3">
                {queues.filter(q => q.status === statusColumn).map((queue) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    layoutId={queue.id}
                    key={queue.id}
                    draggable
                    onDragStart={(e: any) => handleDragStart(e, queue.id)}
                    className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative group"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase border ${getPriorityColor(queue.priority)}`}>
                        {queue.priority.replace('_', ' ')}
                      </span>
                      <span className="flex items-center text-xs text-slate-500">
                        <Clock className="w-3 h-3 mr-1" />{queue.estimatedWait}m
                      </span>
                    </div>

                    <p className="font-semibold text-slate-900 text-sm">
                      {queue.patient?.firstName} {queue.patient?.lastName}
                    </p>

                    <div className="flex flex-col gap-1 mt-1.5">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span className="font-medium text-slate-700">{queue.department?.name || 'Unassigned'}</span>
                      </p>
                      {queue.room && (
                        <p className="text-[10px] font-bold text-blue-600 flex items-center bg-blue-50 px-1.5 py-0.5 rounded w-fit">
                          <BedDouble className="w-3 h-3 mr-1" />
                          {queue.room.name}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="mt-2 grid grid-cols-2 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setTransferTarget(queue)}
                        className="flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        <ArrowRight className="w-3 h-3" />Transfer
                      </button>
                      <button
                        onClick={() => setAssignRoomTarget(queue)}
                        className="flex items-center justify-center gap-1 py-1 text-[10px] font-semibold rounded-lg border border-dashed border-slate-300 text-slate-500 hover:border-green-400 hover:text-green-600 hover:bg-green-50 transition-all"
                      >
                        <BedDouble className="w-3 h-3" />Assign Rm
                      </button>
                    </div>

                    {/* Complete Visit */}
                    {queue.status === 'READY_FOR_DISCHARGE' && (
                      <button
                        onClick={() => completeVisit(queue.id)}
                        className="w-full mt-2 py-1.5 bg-green-600 text-white text-[10px] font-bold rounded-lg hover:bg-green-700 transition-colors uppercase tracking-wider"
                      >
                        Complete Visit
                      </button>
                    )}
                  </motion.div>
                ))}
                {queues.filter(q => q.status === statusColumn).length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl h-24 flex items-center justify-center">
                    Drop Here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transfer Department Modal */}
      <AnimatePresence>
        {transferTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900">Transfer Patient</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {transferTarget.patient?.firstName} {transferTarget.patient?.lastName} → select new department
                  </p>
                </div>
                <button onClick={() => setTransferTarget(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 space-y-2 max-h-80 overflow-y-auto">
                {departments
                  .filter(d => d.id !== transferTarget.departmentId && d.isActive !== false)
                  .map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => transferDept(transferTarget.id, dept.id)}
                      className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all group"
                    >
                      <p className="font-semibold text-sm text-slate-800 group-hover:text-blue-700">{dept.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wide">{dept.type}</p>
                    </button>
                  ))
                }
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign Room Modal */}
      <AnimatePresence>
        {assignRoomTarget && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div>
                  <h2 className="font-bold text-slate-900">Assign Room</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {assignRoomTarget.patient?.firstName} {assignRoomTarget.patient?.lastName} → select room
                  </p>
                </div>
                <button onClick={() => setAssignRoomTarget(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
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
                      onClick={() => assignRoom(assignRoomTarget.id, room.id)}
                      className="w-full flex items-center justify-between text-left px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-green-400 hover:bg-green-50 transition-all group shadow-sm"
                    >
                      <div>
                        <p className="font-semibold text-sm text-slate-800 group-hover:text-green-700">{room.name}</p>
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
      </AnimatePresence>

      <AddPatientModal
        open={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onPatientAdded={fetchQueues}
      />
    </div>
  );
}
