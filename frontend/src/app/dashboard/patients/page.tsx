'use client';

import { useState } from 'react';
import { Users, Search, Plus } from 'lucide-react';
import AddPatientModal from '@/components/AddPatientModal';

export default function PatientsDashboard() {
  const [showAddPatient, setShowAddPatient] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            <Users className="mr-3 h-8 w-8 text-blue-600" />
            Patient Directory
          </h1>
          <p className="text-slate-500 mt-1">Manage hospital patient records and active queues.</p>
        </div>
        <button
          onClick={() => setShowAddPatient(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-md shadow-blue-500/20 hover:bg-blue-700 transition-colors flex items-center"
        >
          <Plus className="w-5 h-5 mr-1" />
          Register Patient
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
            placeholder="Search patients by name, Queue Ref, or Phone..."
          />
        </div>

        <div className="text-center py-16 text-slate-500">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-lg font-medium text-slate-900">Directory Ready</p>
          <p className="text-sm mt-1">Search to view patient history or click Register to add a new patient.</p>
        </div>
      </div>

      <AddPatientModal
        open={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onPatientAdded={() => {}} // Could refresh patients list here if we implement fetchPatients
      />
    </div>
  );
}
