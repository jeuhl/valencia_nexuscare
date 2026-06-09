'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BedDouble, CheckCircle2, Brush, Lock, RefreshCw, Plus, Search, X, Trash2 } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import CreateRoomModal from '@/components/CreateRoomModal';
import { getApiUrl, getSocketUrl } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  OPEN:     { label: 'Open',     color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: CheckCircle2 },
  OCCUPIED: { label: 'Occupied', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     icon: BedDouble    },
  CLEANING: { label: 'Cleaning', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: Brush        },
  RESERVED: { label: 'Reserved', color: 'text-slate-700',  bg: 'bg-slate-50 border-slate-200',   icon: Lock         },
};

const STATUS_BAR: Record<string, string> = {
  OPEN:     'bg-green-400',
  OCCUPIED: 'bg-blue-400',
  CLEANING: 'bg-yellow-400',
  RESERVED: 'bg-slate-400',
};

const FILTER_OPTIONS = ['ALL', 'OPEN', 'OCCUPIED', 'CLEANING'] as const;
type FilterOption = typeof FILTER_OPTIONS[number];

const NEXT_STATUS: Record<string, string> = {
  OPEN: 'OCCUPIED', OCCUPIED: 'CLEANING', CLEANING: 'OPEN', RESERVED: 'OPEN',
};

export default function RoomTrackingPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterOption>('ALL');

  const fetchRooms = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setRooms(Array.isArray(data) ? data : []);
    } catch { setRooms([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchRooms();
    const socket = io(getSocketUrl());
    socket.on('ROOM_UPDATED', (room: any) => {
      setRooms(prev => {
        const exists = prev.find(r => r.id === room.id);
        if (exists) return prev.map(r => r.id === room.id ? { ...r, ...room } : r);
        return [...prev, room];
      });
      toast.success(`Room ${room.name} updated`);
    });
    return () => { socket.disconnect(); };
  }, [fetchRooms]);

  const updateRoom = async (id: string, status: string) => {
    const token = localStorage.getItem('token');
    await fetch(`${getApiUrl()}/api/rooms/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
  };

  const deleteRoom = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete room "${name}"?`)) return;
    const token = localStorage.getItem('token');
    const res = await fetch(`${getApiUrl()}/api/rooms/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      toast.success('Room deleted');
      fetchRooms();
    } else {
      toast.error('Failed to delete room');
    }
  };

  // Filtered + searched rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter(room => {
      const matchesStatus = statusFilter === 'ALL' || room.status === statusFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        room.name?.toLowerCase().includes(q) ||
        room.department?.name?.toLowerCase().includes(q) ||
        room.queues?.[0]?.patient?.firstName?.toLowerCase().includes(q) ||
        room.queues?.[0]?.patient?.lastName?.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [rooms, statusFilter, search]);

  const grouped = useMemo(() => {
    return filteredRooms.reduce((acc: Record<string, any[]>, room) => {
      const key = room.department?.name || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push(room);
      return acc;
    }, {});
  }, [filteredRooms]);

  const stats = {
    open:     rooms.filter(r => r.status === 'OPEN').length,
    occupied: rooms.filter(r => r.status === 'OCCUPIED').length,
    cleaning: rooms.filter(r => r.status === 'CLEANING').length,
    reserved: rooms.filter(r => r.status === 'RESERVED').length,
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center">
            <BedDouble className="mr-2.5 h-6 w-6 md:h-7 md:w-7 text-blue-600" />Room Tracking
          </h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">Live occupancy, bed turnover, and cleaning queue management.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />Create Room
          </button>
          <button
            onClick={fetchRooms}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {Object.entries(stats).map(([key, val]) => {
          const cfg = STATUS_CONFIG[key.toUpperCase()];
          const Icon = cfg?.icon || BedDouble;
          const isActive = statusFilter === key.toUpperCase();
          return (
            <button
              key={key}
              onClick={() => setStatusFilter(isActive ? 'ALL' : key.toUpperCase() as FilterOption)}
              className={`rounded-2xl border p-5 flex items-center justify-between text-left transition-all ${cfg?.bg} ${isActive ? 'ring-2 ring-offset-1 ring-blue-400 shadow-md' : 'hover:shadow-sm'}`}
            >
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{cfg?.label}</p>
                <p className={`text-3xl font-bold mt-1 ${cfg?.color}`}>{val}</p>
              </div>
              <Icon className={`w-8 h-8 opacity-30 ${cfg?.color}`} />
            </button>
          );
        })}
      </div>

      {/* Search + Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by room, department, or patient name…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 bg-slate-100 p-1 rounded-xl">
          {FILTER_OPTIONS.map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === f
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f === 'ALL' ? 'All Rooms' : STATUS_CONFIG[f]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Result count when filtering */}
      {(search || statusFilter !== 'ALL') && (
        <p className="text-xs text-slate-500 mb-4">
          Showing <span className="font-semibold text-slate-700">{filteredRooms.length}</span> of {rooms.length} rooms
          {statusFilter !== 'ALL' && <> · filtered by <span className="font-semibold">{STATUS_CONFIG[statusFilter]?.label}</span></>}
          {search && <> · matching "<span className="font-semibold">{search}</span>"</>}
        </p>
      )}

      {/* Room Grid by Department */}
      {loading ? (
        <div className="text-center py-20 text-slate-400">Loading rooms...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <BedDouble className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-medium text-slate-600">
            {rooms.length === 0 ? 'No rooms in database yet' : 'No rooms match your search / filter'}
          </p>
          {rooms.length === 0 && <p className="text-sm mt-1">Re-run the seed script to populate rooms.</p>}
          {(search || statusFilter !== 'ALL') && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <div key={`${statusFilter}-${search}`}>
            {Object.entries(grouped).map(([deptName, deptRooms]) => (
              <div key={deptName} className="mb-8">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">{deptName}</h2>
                  <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{deptRooms.length} rooms</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {deptRooms.map((room, i) => {
                    const cfg = STATUS_CONFIG[room.status] || STATUS_CONFIG.OPEN;
                    const Icon = cfg.icon;
                    const next = NEXT_STATUS[room.status];
                    return (
                      <motion.div
                        key={room.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: i * 0.04 }}
                        className={`bg-white border-2 ${cfg.bg.split(' ')[1]} rounded-2xl p-5 relative overflow-hidden shadow-sm`}
                      >
                        <div className={`absolute top-0 left-0 w-full h-1 ${STATUS_BAR[room.status] ?? 'bg-slate-400'}`} />
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-slate-900">{room.name}</h3>
                            {room.floor && <p className="text-[10px] text-slate-400">Floor {room.floor}</p>}
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color} ${cfg.bg}`}>
                            {cfg.label}
                          </span>
                        </div>
                        {room.queues?.length > 0 && (
                          <p className="text-xs text-slate-500 mb-3">
                            Patient: <span className="font-medium text-slate-800">
                              {room.queues[0]?.patient?.firstName} {room.queues[0]?.patient?.lastName}
                            </span>
                          </p>
                        )}
                        <div className="flex gap-2 w-full mt-2">
                          <button
                            onClick={() => updateRoom(room.id, next)}
                            className="flex-1 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            → Mark {STATUS_CONFIG[next]?.label}
                          </button>
                          <button
                            onClick={() => deleteRoom(room.id, room.name)}
                            className="px-2 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </AnimatePresence>
      )}

      <CreateRoomModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onRoomAdded={fetchRooms}
      />
    </div>
  );
}
