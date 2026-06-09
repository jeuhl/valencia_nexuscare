'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Clock, Users, Bell, CheckCircle2, ArrowLeft, Stethoscope, TestTube2, BedDouble, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { io } from 'socket.io-client';
import { getApiUrl, getSocketUrl } from '@/lib/api';

const STATUS_STEPS = [
  { key: 'WAITING',             label: 'In Queue',          icon: Users        },
  { key: 'VITALS_TAKEN',        label: 'Vitals Taken',      icon: Activity     },
  { key: 'ROOM_ASSIGNED',       label: 'Room Assigned',     icon: BedDouble    },
  { key: 'IN_CONSULTATION',     label: 'In Consultation',   icon: Stethoscope  },
  { key: 'SENT_TO_LAB',         label: 'Lab Tests',         icon: TestTube2    },
  { key: 'TREATMENT_ONGOING',   label: 'Treatment',         icon: Activity     },
  { key: 'READY_FOR_DISCHARGE', label: 'Ready to Go',       icon: CheckCircle2 },
];

const STATUS_COLOR: Record<string, string> = {
  WAITING:             'text-orange-700 bg-orange-50 border-orange-200',
  VITALS_TAKEN:        'text-blue-700 bg-blue-50 border-blue-200',
  ROOM_ASSIGNED:       'text-indigo-700 bg-indigo-50 border-indigo-200',
  IN_CONSULTATION:     'text-purple-700 bg-purple-50 border-purple-200',
  SENT_TO_LAB:         'text-yellow-700 bg-yellow-50 border-yellow-200',
  TREATMENT_ONGOING:   'text-blue-700 bg-blue-50 border-blue-200',
  READY_FOR_DISCHARGE: 'text-green-700 bg-green-50 border-green-200',
  COMPLETED:           'text-slate-600 bg-slate-50 border-slate-200',
};

export default function PatientStatusPage() {
  const params    = useParams();
  const queueRef  = Array.isArray(params.queueRef) ? params.queueRef[0] : params.queueRef as string;
  const [data, setData]         = useState<any>(null);
  const [error, setError]       = useState('');
  const [notified, setNotified] = useState(false);
  const [isNightMode, setIsNightMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('night-mode');
    if (stored === 'true') {
      setIsNightMode(true);
      document.documentElement.classList.add('night-mode');
    }
  }, []);

  const toggleNightMode = () => {
    const newVal = !isNightMode;
    setIsNightMode(newVal);
    localStorage.setItem('night-mode', String(newVal));
    if (newVal) {
      document.documentElement.classList.add('night-mode');
    } else {
      document.documentElement.classList.remove('night-mode');
    }
  };

  const fetchStatus = useCallback(async () => {
    if (!queueRef) return;
    try {
      const res  = await fetch(`${getApiUrl()}/api/patient/${queueRef}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Queue not found');
      setData(json);
      setError('');
    } catch (err: any) {
      setError(err.message);
    }
  }, [queueRef]);

  useEffect(() => {
    fetchStatus();
    const socket = io(getSocketUrl());
    socket.on('QUEUE_UPDATED', fetchStatus);
    return () => { socket.disconnect(); };
  }, [fetchStatus]);

  /* ─── Error State ─── */
  if (error) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 text-center max-w-sm w-full">
        <Activity className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Queue Not Found</h2>
        <p className="text-slate-500 text-sm mb-5">{error}</p>
        <Link href="/patient" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />Try Again
        </Link>
      </div>
    </div>
  );

  /* ─── Loading State ─── */
  if (!data) return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
    </div>
  );

  const { patient, queue } = data;
  const currentStep  = STATUS_STEPS.findIndex(s => s.key === queue.status);
  const isComplete   = queue.status === 'COMPLETED';
  const isNearTurn   = queue.position <= 2 && queue.status === 'WAITING';
  const statusCls    = STATUS_COLOR[queue.status] || STATUS_COLOR.WAITING;

  return (
    <div className="min-h-screen medical-bg flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-5 py-4 bg-white/10 backdrop-blur-sm border-b border-white/10">
        <Link href="/patient" className="flex items-center gap-1.5 text-slate-900 text-sm hover:text-blue-600 transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" />Back
        </Link>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="text-slate-900 font-bold">NexusCare</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggleNightMode} className="text-slate-500 hover:text-slate-900 transition-colors" title="Toggle Night Mode">
            {isNightMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <span className="text-slate-400 text-xs font-bold tracking-widest">{patient.queueRef}</span>
        </div>
      </div>

      <div className="flex-1 px-4 pb-8 flex flex-col items-center">
        <div className="w-full max-w-md space-y-4">

          {/* Near-turn Alert */}
          <AnimatePresence>
            {isNearTurn && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-orange-400 text-white rounded-2xl p-4 flex items-center gap-3"
              >
                <Bell className="w-6 h-6 shrink-0 animate-bounce" />
                <div>
                  <p className="font-bold text-sm">Almost your turn!</p>
                  <p className="text-orange-100 text-xs mt-0.5">Please make your way to the reception area.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Card */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl shadow-blue-900/20 overflow-hidden">
            <div className={`h-2 w-full ${
              queue.status === 'WAITING' ? 'bg-orange-400' :
              queue.status === 'READY_FOR_DISCHARGE' ? 'bg-green-400' :
              queue.status === 'COMPLETED' ? 'bg-slate-400' : 'bg-blue-500'
            }`} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Welcome</p>
                  <h1 className="text-2xl font-bold text-slate-900 mt-0.5">{patient.firstName}</h1>
                </div>
                <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${statusCls}`}>
                  {queue.status.replace(/_/g, ' ')}
                </span>
              </div>

              {isComplete ? (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-3" />
                  <p className="text-lg font-bold text-slate-900">Visit Complete</p>
                  <p className="text-slate-500 text-sm mt-1">Thank you for visiting NexusCare. Stay well!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Est. Wait</p>
                    <p className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                      <Clock className="w-5 h-5 text-blue-500" />~{queue.estimatedWait}m
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-xs text-slate-500 font-medium mb-1">Position</p>
                    <p className="text-2xl font-bold text-slate-900 flex items-center gap-1">
                      <Users className="w-5 h-5 text-blue-500" />#{queue.position}
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 text-xs flex justify-between">
                <span className="text-slate-500">Department</span>
                <span className="font-semibold text-slate-800">{queue.department}</span>
              </div>
            </div>
          </motion.div>

          {/* Journey Steps */}
          {!isComplete && (
            <div className="bg-white/90 backdrop-blur rounded-3xl shadow-lg p-6">
              <h2 className="text-sm font-bold text-slate-700 mb-4">Your Journey</h2>
              <div className="space-y-3">
                {STATUS_STEPS.map((step, i) => {
                  const done    = i < currentStep;
                  const current = i === currentStep;
                  const Icon    = step.icon;
                  return (
                    <div key={step.key} className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                        done    ? 'bg-green-500 text-white' :
                        current ? 'bg-blue-600 text-white ring-4 ring-blue-200' :
                                  'bg-slate-100 text-slate-400'
                      }`}>
                        {done ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                      </div>
                      <p className={`text-sm font-medium ${
                        current ? 'text-blue-700' : done ? 'text-slate-400 line-through' : 'text-slate-400'
                      }`}>{step.label}</p>
                      {current && (
                        <span className="ml-auto text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                          Now
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notify Button */}
          {!isComplete && (
            <button
              onClick={() => setNotified(true)}
              className={`w-full py-3.5 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                notified ? 'bg-green-500 text-white' : 'bg-white text-slate-800 shadow-lg hover:shadow-xl'
              }`}
            >
              {notified ? <CheckCircle2 className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
              {notified ? 'Notification Set ✓' : "Notify Me When It's My Turn"}
            </button>
          )}

          <p className="text-blue-100 text-xs text-center">
            Live updates · Ref: {patient.queueRef}
          </p>
        </div>
      </div>
    </div>
  );
}
