import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { BottomSheet, MemberAvatar, TripCodeBadge, Spinner } from '../ui/index.jsx';

export default function MembersPanel({ isOpen, onClose, trip, members, session, onRefresh }) {
  const [removing, setRemoving] = useState(null);
  const isOrg = session?.isOrganizer;
  const spotsLeft = (trip?.group_size||0) - members.length;

  async function remove(member) {
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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Trip Members">
      <div className="space-y-4 pb-4">
        {/* Status */}
        <div className={`p-3 rounded-xl text-center border text-sm font-bold ${spotsLeft>0?'bg-emerald-50 border-emerald-200 text-emerald-700':'bg-amber-50 border-amber-200 text-amber-700'}`}>
          {members.length}/{trip?.group_size} members{spotsLeft>0?` · ${spotsLeft} spot${spotsLeft>1?'s':''} open`:' · Group Full'}
        </div>

        {/* Members list */}
        <div className="space-y-2">
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
              <MemberAvatar nickname={m.nickname} isOrganizer={m.is_organizer}/>
              <div className="flex-1">
                <div className="font-bold text-slate-800 text-sm">{m.nickname}</div>
                <div className="text-xs text-slate-400">{m.is_organizer?'⭐ Organiser':'Member'} · Joined {new Date(m.joined_at).toLocaleDateString()}</div>
              </div>
              {isOrg && !m.is_organizer && (
                <button onClick={() => remove(m)} disabled={removing===m.id} className="btn-danger px-3 py-1.5 text-xs">
                  {removing===m.id?<Spinner size="sm"/>:'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Invite */}
        {isOrg && spotsLeft>0 && (
          <div className="border-t border-slate-100 pt-4 space-y-3">
            <p className="text-sm font-bold text-slate-600">Invite More</p>
            <TripCodeBadge code={trip?.trip_code} onCopy={() => { navigator.clipboard.writeText(trip?.trip_code); toast.success('Code copied!'); }}/>
            <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join/${trip?.trip_code}`); toast.success('Link copied!'); }}
              className="btn-indigo w-full">🔗 Copy Invite Link</button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
