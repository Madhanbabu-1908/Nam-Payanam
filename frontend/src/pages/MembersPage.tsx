import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Copy, Check, Crown, User, X, Hash, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MembersPage() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [members, setMembers] = useState<any[]>([]);
  const [trip, setTrip]       = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOrg, setIsOrg]     = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const load = async () => {
    if (!tripId) return;
    try {
      const [tripRes, memRes] = await Promise.all([
        api.get(`/trips/${tripId}`),
        api.get(`/trips/${tripId}/members`).catch(() => ({ data: { data: [] } })),
      ]);
      const t = tripRes.data.data;
      setTrip(t);
      setIsOrg(t.organizer_id === user?.id);

      const rawMembers = memRes.data.data || [];
      // Add organizer if not in list
      if (!rawMembers.find((m: any) => m.user_id === t.organizer_id)) {
        rawMembers.unshift({ user_id: t.organizer_id, role: 'ORGANIZER', profile: { email: user?.email, full_name: user?.user_metadata?.full_name } });
      }
      setMembers(rawMembers);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [tripId, user]);

  const removeMember = async (memberId: string) => {
    if (!confirm('Remove this member from the trip?')) return;
    try {
      await api.delete(`/trips/${tripId}/members/${memberId}`);
      setMembers(m => m.filter(x => x.user_id !== memberId));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  const inviteLink = `${window.location.origin}/join/${tripId}`;
  const tripCode = trip?.trip_code || '';

  const copyLink = () => { navigator.clipboard.writeText(inviteLink); setCopiedLink(true); toast.success('Invite link copied!'); setTimeout(() => setCopiedLink(false), 2000); };
  const copyCode = () => { navigator.clipboard.writeText(tripCode); setCopiedCode(true); toast.success('Trip code copied!'); setTimeout(() => setCopiedCode(false), 2000); };

  const getName = (m: any) => m.profile?.full_name || m.profile?.email?.split('@')[0] || m.user_id?.substring(0, 8);

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={() => navigate(-1)} className="btn-icon bg-[var(--bg)]"><ArrowLeft size={20} className="text-[var(--muted)]"/></button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Members</h1>
          <span className="badge badge-slate">{members.length} people</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-10">
        {/* Invite options */}
        <div className="card p-4 space-y-3">
          <p className="font-display font-bold text-[var(--text)]">Invite to Trip</p>
          <p className="text-[var(--muted)] text-xs">Share invite link OR trip code</p>

          {/* Invite link */}
          <div className="flex items-center gap-2 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
            <Link2 size={14} className="text-[var(--muted)] flex-shrink-0"/>
            <span className="text-xs font-mono text-[var(--muted)] flex-1 truncate">{inviteLink}</span>
            <button onClick={copyLink} className="flex items-center gap-1 text-xs font-bold text-brand bg-brand/10 px-2.5 py-1 rounded-lg flex-shrink-0">
              {copiedLink ? <Check size={12}/> : <Copy size={12}/>}{copiedLink ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Trip code */}
          {tripCode && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-3 py-2.5">
                <Hash size={14} className="text-[var(--muted)]"/>
                <span className="font-display font-black text-brand text-lg tracking-widest">{tripCode}</span>
              </div>
              <button onClick={copyCode} className="btn-secondary py-2.5 px-4 text-sm">
                {copiedCode ? <Check size={14} className="text-jade"/> : <Copy size={14}/>}
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          )}
        </div>

        {/* Members list */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <p className="font-bold text-[var(--text)] text-sm">Group Members</p>
          </div>
          {loading ? (
            <div className="space-y-1 p-2">{[1,2,3].map(i=><div key={i} className="skeleton h-14 rounded-xl"/>)}</div>
          ) : members.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted)] text-sm">No members yet. Share the invite link!</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {members.map((m: any) => {
                const isHost = m.user_id === trip?.organizer_id || m.role === 'ORGANIZER';
                const isMe   = m.user_id === user?.id;
                const name   = isMe ? 'You' : getName(m);
                return (
                  <div key={m.id || m.user_id} className="flex items-center gap-3 px-4 py-3.5">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-base flex-shrink-0 ${isHost ? 'bg-brand/15 text-brand' : 'bg-[var(--bg)] text-[var(--muted)]'}`}>
                      {isHost ? <Crown size={18}/> : name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[var(--text)] text-sm">{name}</p>
                      <p className="text-[var(--muted)] text-xs truncate">{m.profile?.email || ''}</p>
                    </div>
                    {isHost && <span className="badge badge-brand">Host</span>}
                    {isOrg && !isHost && !isMe && (
                      <button onClick={() => removeMember(m.user_id)} className="btn-icon text-rose-500 hover:bg-rose-50 w-8 h-8">
                        <X size={15}/>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
