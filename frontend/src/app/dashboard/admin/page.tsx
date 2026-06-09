'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserCog, Users, ShieldCheck, Plus, X, Pencil, Check,
  Building2, Activity, ToggleLeft, ToggleRight, BarChart3, Trash2
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import toast from 'react-hot-toast';
import AnalyticsTab from '@/components/AnalyticsTab';
import { io } from 'socket.io-client';

const ROLE_COLORS: Record<string, string> = {
  ADMIN:          'bg-red-100 text-red-700',
  DOCTOR:         'bg-blue-100 text-blue-700',
  NURSE:          'bg-green-100 text-green-700',
  LAB_STAFF:      'bg-yellow-100 text-yellow-700',
  CLEANING_STAFF: 'bg-slate-100 text-slate-700',
  RECEPTIONIST:   'bg-purple-100 text-purple-700',
  PATIENT:        'bg-cyan-100 text-cyan-700',
};

const DEPT_TYPE_COLORS: Record<string, string> = {
  TRIAGE:     'bg-red-50 text-red-600 border-red-200',
  DIAGNOSTIC: 'bg-blue-50 text-blue-600 border-blue-200',
  TREATMENT:  'bg-green-50 text-green-600 border-green-200',
  DISCHARGE:  'bg-slate-50 text-slate-600 border-slate-200',
};

type Tab = 'users' | 'departments' | 'analytics' | 'logs';

interface EditUserState {
  id: string;
  name: string;
  email: string;
  role: string;
  password: string;
}

interface EditDeptState {
  id: string;
  name: string;
  type: string;
  capacity: number;
  isActive: boolean;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Staff form state
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'NURSE' });
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<EditUserState | null>(null);

  // Dept state
  const [newDept, setNewDept] = useState({ name: '', type: 'TREATMENT', capacity: 10 });
  const [showDeptForm, setShowDeptForm] = useState(false);
  const [editDept, setEditDept] = useState<EditDeptState | null>(null);

  const token = () => localStorage.getItem('token');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab') as Tab;
      if (['users', 'departments', 'analytics', 'logs'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/users`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setUsers(await res.json());
    } catch {}
  }, []);

  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/departments`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setDepartments(await res.json());
    } catch {}
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${getApiUrl()}/api/admin/logs`, { headers: { Authorization: `Bearer ${token()}` } });
      if (res.ok) setLogs(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    else if (activeTab === 'departments') fetchDepartments();
    else if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchUsers, fetchDepartments, fetchLogs]);

  useEffect(() => {
    const socket = io(getApiUrl());
    socket.on('ROOM_UPDATED', fetchDepartments);
    socket.on('QUEUE_UPDATED', () => {
      fetchDepartments();
      fetchLogs();
    });
    return () => {
      socket.disconnect();
    };
  }, [fetchDepartments, fetchLogs]);

  // ---------- Staff handlers ----------
  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${getApiUrl()}/api/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(newUser),
    });
    if (res.ok) {
      toast.success('Staff account created');
      setNewUser({ name: '', email: '', password: '', role: 'NURSE' });
      setShowForm(false);
      fetchUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create account');
    }
  };

  const saveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    const body: any = { name: editUser.name, email: editUser.email, role: editUser.role };
    if (editUser.password) body.password = editUser.password;
    const res = await fetch(`${getApiUrl()}/api/admin/users/${editUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success('Staff updated');
      setEditUser(null);
      fetchUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Update failed');
    }
  };

  const deleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete staff "${name}"?`)) return;
    const res = await fetch(`${getApiUrl()}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) {
      toast.success('Staff deleted');
      fetchUsers();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to delete staff');
    }
  };

  // ---------- Department handlers ----------
  const createDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${getApiUrl()}/api/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify(newDept),
    });
    if (res.ok) {
      toast.success('Department created');
      setNewDept({ name: '', type: 'TREATMENT', capacity: 10 });
      setShowDeptForm(false);
      fetchDepartments();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create department');
    }
  };

  const saveDept = async () => {
    if (!editDept) return;
    const res = await fetch(`${getApiUrl()}/api/departments/${editDept.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({
        name: editDept.name,
        type: editDept.type,
        capacity: editDept.capacity,
        isActive: editDept.isActive
      }),
    });
    if (res.ok) {
      toast.success('Department updated');
      setEditDept(null);
      fetchDepartments();
    } else {
      toast.error('Update failed');
    }
  };

  const toggleDeptActive = async (dept: any) => {
    const res = await fetch(`${getApiUrl()}/api/departments/${dept.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ isActive: !dept.isActive }),
    });
    if (res.ok) {
      toast.success(`Department ${dept.isActive ? 'deactivated' : 'activated'}`);
      fetchDepartments();
    }
  };

  const deleteDept = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete department "${name}"? This will also delete all rooms in this department.`)) return;
    const res = await fetch(`${getApiUrl()}/api/departments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` }
    });
    if (res.ok) {
      toast.success('Department deleted');
      fetchDepartments();
    } else {
      toast.error('Failed to delete department');
    }
  };

  const roleCount = users.reduce((acc: Record<string, number>, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: 'users',       label: 'Staff',       icon: Users },
    { key: 'departments', label: 'Departments',  icon: Building2 },
    { key: 'analytics',   label: 'Analytics',    icon: BarChart3 },
    { key: 'logs',        label: 'Audit Logs',   icon: ShieldCheck },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header and Tabs */}
      <div className="mb-6 flex flex-col justify-start items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center">
            <UserCog className="mr-2.5 h-7 w-7 text-blue-600" />Admin Panel
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage staff, departments, analytics, and system activity.</p>
        </div>
        
        {/* Tabs below title */}
        <div className="bg-slate-100 p-1 rounded-xl flex gap-1 w-full sm:w-auto overflow-x-auto shrink-0">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── STAFF TAB ─── */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Staff Management</h2>
            <button
              onClick={() => { setShowForm(f => !f); setEditUser(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />Add Staff
            </button>
          </div>

          {/* Role Distribution */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-3">
            {Object.entries(ROLE_COLORS).map(([role, cls]) => (
              <div key={role} className="bg-white rounded-xl border border-slate-100 p-3 text-center shadow-sm">
                <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 ${cls}`}>
                  {role.replace('_', ' ')}
                </p>
                <p className="text-xl font-bold text-slate-900">{roleCount[role] || 0}</p>
              </div>
            ))}
          </div>

          {/* Add User Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">Register New Staff Member</h3>
                  <button onClick={() => setShowForm(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={createUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} placeholder="Full Name" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input required type="email" value={newUser.email} onChange={e => setNewUser(p => ({...p, email: e.target.value}))} placeholder="Email" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input required type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} placeholder="Password" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    {Object.keys(ROLE_COLORS).filter(r => r !== 'PATIENT').map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="col-span-2 flex gap-3">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                      Create Account
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Edit User Form */}
          <AnimatePresence>
            {editUser && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-amber-500" />Edit Staff Member
                  </h3>
                  <button onClick={() => setEditUser(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={saveEditUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input required value={editUser.name} onChange={e => setEditUser(p => p ? {...p, name: e.target.value} : p)} placeholder="Full Name" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  <input required type="email" value={editUser.email} onChange={e => setEditUser(p => p ? {...p, email: e.target.value} : p)} placeholder="Email" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  <input type="password" value={editUser.password} onChange={e => setEditUser(p => p ? {...p, password: e.target.value} : p)} placeholder="New password (leave blank to keep)" className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none" />
                  <select value={editUser.role} onChange={e => setEditUser(p => p ? {...p, role: e.target.value} : p)} className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-amber-400 outline-none">
                    {Object.keys(ROLE_COLORS).filter(r => r !== 'PATIENT').map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="col-span-2 flex gap-3">
                    <button type="button" onClick={() => setEditUser(null)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-1 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-600 transition-colors">
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <h2 className="font-semibold text-slate-900">All Staff Accounts</h2>
              <span className="ml-auto text-xs text-slate-400">{users.length} accounts</span>
            </div>
            <table className="min-w-full divide-y divide-slate-50">
              <thead className="bg-slate-50">
                <tr>
                  {['Name', 'Email', 'Role', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.length === 0 && (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Loading users...</td></tr>
                )}
                {users.map((u, i) => (
                  <motion.tr key={u.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-slate-50">
                    <td className="px-5 py-3.5 text-sm font-semibold text-slate-900">{u.name}</td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{u.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || 'bg-slate-100 text-slate-700'}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditUser({ id: u.id, name: u.name, email: u.email, role: u.role, password: '' })}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-colors"
                        >
                          <Pencil className="w-3 h-3" />Edit
                        </button>
                        <button
                          onClick={() => deleteUser(u.id, u.name)}
                          className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />Delete
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── DEPARTMENTS TAB ─── */}
      {activeTab === 'departments' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Departments Setup</h2>
            <button
              onClick={() => { setShowDeptForm(f => !f); setEditDept(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />Add Department
            </button>
          </div>

          {/* Add Dept Form */}
          <AnimatePresence>
            {showDeptForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white rounded-2xl border border-blue-200 shadow-sm p-5 overflow-hidden"
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-slate-900">Create New Department</h3>
                  <button onClick={() => setShowDeptForm(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <form onSubmit={createDept} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="col-span-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Department Name</label>
                    <input required value={newDept.name} onChange={e => setNewDept(p => ({...p, name: e.target.value}))} placeholder="e.g. ICU" className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
                    <select value={newDept.type} onChange={e => setNewDept(p => ({...p, type: e.target.value}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                      {Object.keys(DEPT_TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="col-span-1 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Initial Capacity</label>
                    <input required type="number" min={1} value={newDept.capacity} onChange={e => setNewDept(p => ({...p, capacity: Number(e.target.value)}))} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="col-span-1 sm:col-span-3 flex gap-3 mt-2">
                    <button type="button" onClick={() => setShowDeptForm(false)} className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" className="flex-[2] py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
                      Create Department
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {departments.map((dept, i) => {
              const typeCls = DEPT_TYPE_COLORS[dept.type] || 'bg-slate-50 text-slate-600 border-slate-200';
              const isEditing = editDept?.id === dept.id;
              const occupancy = dept._count?.queues ?? 0;
              const cap = dept.capacity ?? 10;
              const pct = Math.min(100, Math.round((occupancy / cap) * 100));
              const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-orange-400' : pct > 40 ? 'bg-yellow-400' : 'bg-green-400';

              return (
                <motion.div
                  key={dept.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-opacity ${dept.isActive ? 'opacity-100' : 'opacity-60'}`}
                >
                  <div className={`h-1.5 w-full ${barColor}`} />
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{dept.name}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${typeCls} mt-1 inline-block`}>
                          {dept.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteDept(dept.id, dept.name)}
                          className="p-1.5 rounded-lg transition-colors text-slate-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete department"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => toggleDeptActive(dept)}
                          className={`p-1.5 rounded-lg transition-colors ${dept.isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}
                          title={dept.isActive ? 'Deactivate department' : 'Activate department'}
                        >
                          {dept.isActive ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Occupancy</span>
                        <span className="font-semibold">{occupancy}/{cap} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, delay: i * 0.05 }}
                          className={`h-2 rounded-full ${barColor}`}
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 text-xs text-slate-500 mb-4">
                      <span className="bg-slate-50 rounded-lg px-2 py-1">{dept.rooms?.length ?? 0} rooms</span>
                      <span className="bg-slate-50 rounded-lg px-2 py-1">{occupancy} active queues</span>
                    </div>

                    {/* Edit inline */}
                    {isEditing ? (
                      <div className="border border-blue-200 rounded-xl p-3 bg-blue-50 space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="col-span-2">
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Name</label>
                            <input value={editDept!.name} onChange={e => setEditDept(p => p ? { ...p, name: e.target.value } : p)} className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Type</label>
                            <select value={editDept!.type} onChange={e => setEditDept(p => p ? { ...p, type: e.target.value } : p)} className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                              {Object.keys(DEPT_TYPE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-semibold text-slate-600 mb-1 block">Capacity</label>
                            <input type="number" min={1} value={editDept!.capacity} onChange={e => setEditDept(p => p ? { ...p, capacity: Number(e.target.value) } : p)} className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white" />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setEditDept(null)} className="flex-1 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                          <button onClick={saveDept} className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1">
                            <Check className="w-3 h-3" />Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditDept({ id: dept.id, name: dept.name, type: dept.type, capacity: dept.capacity ?? 10, isActive: dept.isActive ?? true })}
                        className="w-full py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />Edit Details
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {departments.length === 0 && (
            <div className="text-center py-20 text-slate-400 bg-white rounded-2xl border border-slate-100">
              <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="font-medium text-slate-600">No departments found</p>
              <p className="text-sm mt-1">Re-run the seed script to populate departments.</p>
            </div>
          )}
        </div>
      )}

      {/* ─── ANALYTICS TAB ─── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <AnalyticsTab />
        </div>
      )}

      {/* ─── AUDIT LOGS TAB ─── */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              System Audit Logs
            </h2>
          </div>
          <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto">
            {logs.length === 0 ? (
              <div className="py-20 text-center text-slate-400">No activity logs recorded yet.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold text-blue-600 uppercase tracking-tight">{log.action}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-slate-800">{log.details}</p>
                  <p className="text-[10px] text-slate-500 mt-1">By: <span className="font-semibold">{log.user?.name}</span> ({log.user?.role})</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
