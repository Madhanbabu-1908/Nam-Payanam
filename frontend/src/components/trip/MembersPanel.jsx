import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { BottomSheet, MemberAvatar, TripCodeBadge } from '../ui/index.jsx';

export default function MembersPanel({ isOpen, onClose, trip, members, session, onRefresh }) {
  const [removing, setRemoving] = useState(null);
  const isOrganizer = session?.isOrganizer;
  const spotsLeft = (trip?.group_size || 0) - members.length;

  async function handleRemove(member) {
    if (!confirm(`Remove ${member.nickname}?`)) return;
    setRemoving(member.id);
    try {
      await tripAPI.removeMember(trip.id, member.id, session?.memberId);
      toast.success(`${member.nickname} removed`);
      onRefresh();
    } catch (err) { toast.error(err.message); }
    finally { setRemoving(null); }
  }

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="👥 Trip Members">
      <div className="space-y-4 pb-4">
        {/* Status pill */}
        <div className={`text-center py-2.5 rounded-xl text-sm font-bold ${spotsLeft > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          {members.length} / {trip?.group_size} members
          {spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} open` : ' · Group Full 🎯'}
        </div>

        {/* Members */}
        <div className="space-y-2">
          {members.map(member => (
            <div key={member.id} className={`flex items-center gap-3 p-3 rounded-2xl border ${member.is_organizer ? 'bg-orange-50 border-orange-100' : 'bg-slate-50 border-slate-100'}`}>
              <MemberAvatar nickname={member.nickname} isOrganizer={member.is_organizer} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 text-sm truncate">{member.nickname}</span>
                  {member.nickname === session?.nickname && (
                    <span className="text-[10px] bg-blue-100 text-blue-600 font-bold px-1.5 py-0.5 rounded-md">You</span>
                  )}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {member.is_organizer ? '⭐ Organiser' : '👤 Member'} · {new Date(member.joined_at).toLocaleDateString('en-IN', {day:'numeric',month:'short'})}
                </div>
              </div>
              {isOrganizer && !member.is_organizer && member.id !== session?.memberRowId && (
                <button onClick={() => handleRemove(member)} disabled={removing === member.id}
                  className="text-xs bg-red-50 border border-red-200 text-red-600 font-bold px-2.5 py-1.5 rounded-lg active:scale-95">
                  {removing === member.id ? '...' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Invite (organiser, space left) */}
        {isOrganizer && spotsLeft > 0 && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-sm font-bold text-slate-700">Invite Travel Buddies</p>
            <TripCodeBadge code={trip?.trip_code} onCopy={() => { navigator.clipboard.writeText(trip?.trip_code); toast.success('Code copied!'); }} />
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${trip?.trip_code}`); toast.success('Invite link copied!'); }}
              className="btn-ocean w-full flex items-center justify-center gap-2">
              🔗 Copy Invite Link
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
