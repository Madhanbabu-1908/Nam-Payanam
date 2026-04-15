import { useState } from 'react';
import { tripAPI } from '../../utils/api';
import toast from 'react-hot-toast';
import { BottomSheet, MemberAvatar, TripCodeBadge } from '../ui/index.jsx';

export default function MembersPanel({ isOpen, onClose, trip, members, session, onRefresh }) {
  const [removing, setRemoving] = useState(null);
  const isOrganizer = session?.isOrganizer;

  async function handleRemove(member) {
    if (!confirm(`Remove ${member.nickname} from the trip?`)) return;
    setRemoving(member.id);
    try {
      await tripAPI.removeMember(trip.id, member.id, session?.memberId);
      toast.success(`${member.nickname} removed`);
      onRefresh();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRemoving(null);
    }
  }

  function copyInvite() {
    const link = `${window.location.origin}/join/${trip?.trip_code}`;
    navigator.clipboard.writeText(link);
    toast.success('Invite link copied!');
  }

  const spotsLeft = (trip?.group_size || 0) - members.length;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Trip Members">
      <div className="space-y-4 pb-4">
        {/* Group status */}
        <div className={`p-3 rounded-xl border text-center ${spotsLeft > 0 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
          <p className={`text-sm font-bold ${spotsLeft > 0 ? 'text-green-700' : 'text-amber-700'}`}>
            {members.length} / {trip?.group_size} members
            {spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} open` : ' · Group Full'}
          </p>
        </div>

        {/* Members list */}
        <div className="space-y-2">
          {members.map((member, i) => (
            <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
              <MemberAvatar nickname={member.nickname} isOrganizer={member.is_organizer} size="md" />
              <div className="flex-1">
                <div className="font-semibold text-slate-800 text-sm">{member.nickname}</div>
                <div className="text-xs text-slate-400">
                  {member.is_organizer ? '⭐ Organizer' : 'Member'} · Joined {new Date(member.joined_at).toLocaleDateString()}
                </div>
              </div>
              {isOrganizer && !member.is_organizer && member.id !== session?.memberRowId && (
                <button
                  onClick={() => handleRemove(member)}
                  disabled={removing === member.id}
                  className="btn-danger px-3 py-1.5 text-xs"
                >
                  {removing === member.id ? '...' : 'Remove'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Invite section - organizer only */}
        {isOrganizer && spotsLeft > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-sm font-semibold text-slate-600 mb-3">Invite More People</p>
            <TripCodeBadge code={trip?.trip_code} onCopy={() => {
              navigator.clipboard.writeText(trip?.trip_code);
              toast.success('Code copied!');
            }} />
            <button onClick={copyInvite} className="btn-ocean w-full mt-2 flex items-center justify-center gap-2">
              🔗 Copy Invite Link
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
