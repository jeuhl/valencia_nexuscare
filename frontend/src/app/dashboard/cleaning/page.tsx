'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Brush, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import { getApiUrl, getSocketUrl } from '@/lib/api';

export default function CleaningDashboard() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      // Only show rooms that are CLEANING
      setRooms(Array.isArray(data) ? data.filter((r: any) => r.status === 'CLEANING') : []);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const socket = io(getSocketUrl());
    socket.on('ROOM_UPDATED', fetchRooms);
    return () => { socket.disconnect(); };
  }, [fetchRooms]);

  const finishCleaning = async (roomId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${getApiUrl()}/api/rooms/${roomId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'OPEN' }),
      });
      if (!res.ok) throw new Error('Failed to update room');
      toast.success('Room marked as Clean & Open');
      fetchRooms();
    } catch (err) {
      toast.error('Could not update room status');
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 flex items-center">
          <Brush className="mr-3 h-7 w-7 md:h-8 md:w-8 text-blue-600" />
          Cleaning Services
        </h1>
        <p className="text-slate-500 text-xs md:text-sm mt-1">Manage room hygiene and bed turnover requests.</p>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400">Loading rooms...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.length === 0 ? (
            <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-slate-200 mb-4" />
              <p className="font-medium text-lg">All rooms are currently clean!</p>
              <p className="text-sm">New requests will appear here in real-time.</p>
            </div>
          ) : (
            rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-3xl p-6 shadow-lg border border-yellow-100 relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Brush className="w-24 h-24 rotate-12" />
                </div>

                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{room.name}</h3>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {room.department?.name}
                    </p>
                  </div>
                  <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider animate-pulse">
                    Cleaning Required
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="w-4 h-4" />
                    Requested {new Date(room.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                <button
                  onClick={() => finishCleaning(room.id)}
                  className="w-full py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Mark as Clean
                </button>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
