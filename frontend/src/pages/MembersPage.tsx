import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Copy, Check } from 'lucide-react';

export default function MembersPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  
  // Mock Data (Replace with API call later)
  const members = [
    { id: 1, name: 'You (Organizer)', email: 'me@example.com', role: 'ORGANIZER' },
    { id: 2, name: 'Friend One', email: 'friend1@example.com', role: 'PARTICIPANT' },
  ];

  const inviteCode = `NAM-${tripId?.substring(0,6).toUpperCase()}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white px-6 py-4 flex items-center gap-3 shadow-sm">
        <button onClick={() => navigate(-1)}><ArrowLeft /></button>
        <h1 className="font-bold text-lg">Members</h1>
      </header>

      <main className="p-6">
        {/* Invite Card */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg mb-8">
          <h2 className="font-bold text-lg mb-2">Invite Friends</h2>
          <p className="text-indigo-100 text-sm mb-4">Share this code with friends to join the trip.</p>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 flex justify-between items-center border border-white/30">
            <span className="font-mono font-bold text-lg tracking-wider">{inviteCode}</span>
            <button onClick={handleCopy} className="p-2 hover:bg-white/20 rounded transition">
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
          {copied && <p className="text-xs text-center mt-2 text-emerald-200">Copied to clipboard!</p>}
        </div>

        {/* Members List */}
        <h3 className="font-bold text-slate-700 mb-4">Trip Members ({members.length})</h3>
        <div className="space-y-3">
          {members.map((m) => (
            <div key={m.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {m.name[0]}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.role}</p>
                </div>
              </div>
              {m.role === 'ORGANIZER' && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">Host</span>}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}