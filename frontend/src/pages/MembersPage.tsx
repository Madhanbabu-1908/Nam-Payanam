import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Copy, Check, UserPlus, Crown, User, X, Hash } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MembersPage() {
  const { tripId } = useParams();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const [members, setMembers]   = useState<any[]>([]);
  const [trip, setTrip]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [copied, setCopied]     = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [isOrganizer, setIsOrg] = useState(false);

  useEffect(()=>{
    if (!tripId) return;
    Promise.all([
      api.get(`/trips/${tripId}`),
      api.get(`/trips/${tripId}/members`).catch(()=>({data:{data:[]}})),
    ]).then(([tRes,mRes])=>{
      const t=tRes.data.data;
      setTrip(t);
      setIsOrg(t.organizer_id===user?.id);
      setMembers(mRes.data.data||[]);
    }).catch(console.error).finally(()=>setLoading(false));
  },[tripId,user]);

  const remove = async(memberId:string)=>{
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/trips/${tripId}/members/${memberId}`);
      setMembers(m=>m.filter(x=>x.user_id!==memberId));
      toast.success('Member removed');
    } catch { toast.error('Failed to remove member'); }
  };

  // ✅ Correct invite link — goes to /join/:tripId which handles the join flow
  const inviteLink = `${window.location.origin}/join/${tripId}`;
  const tripCode   = trip?.trip_code || '';

  const copyLink=()=>{ navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(()=>setCopied(false),2000); toast.success('Link copied!'); };
  const copyCode=()=>{ navigator.clipboard.writeText(tripCode); setCodeCopied(true); setTimeout(()=>setCodeCopied(false),2000); toast.success('Code copied!'); };

  const memberName=(m:any)=>{
    if (m.user_id===user?.id) return 'You';
    return m.user?.full_name||m.user?.email?.split('@')[0]||m.user_id?.slice(0,8)+'…';
  };

  return (
    <div className="page pt-safe">
      <header className="glass sticky top-0 z-20 px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button onClick={()=>navigate(-1)} className="btn-icon bg-[var(--bg)]"><ArrowLeft size={20} className="text-[var(--muted)]"/></button>
          <h1 className="font-display font-bold text-[var(--text)] flex-1">Members</h1>
          <span className="badge badge-slate">{members.length} people</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4 pb-10">
        {/* Invite card */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-2 mb-1"><UserPlus size={18}/><p className="font-display font-bold">Invite to Trip</p></div>
          <p className="text-white/70 text-sm mb-4">Share the link or trip code with your friends</p>

          {/* Invite link */}
          <div className="bg-white/15 rounded-xl p-3 flex justify-between items-center border border-white/20 mb-3">
            <p className="text-sm font-mono truncate flex-1 mr-2">{inviteLink}</p>
            <button onClick={copyLink} className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition flex items-center gap-1.5 text-sm font-bold flex-shrink-0">
              {copied?<><Check size={15}/>Copied!</>:<><Copy size={15}/>Copy</>}
            </button>
          </div>

          {/* Trip code */}
          {tripCode && (
            <div className="bg-white/15 rounded-xl p-3 flex justify-between items-center border border-white/20">
              <div className="flex items-center gap-2">
                <Hash size={16} className="text-white/70"/>
                <p className="font-display font-black text-lg tracking-[.2em] text-white">{tripCode}</p>
                <span className="text-white/50 text-xs">Trip Code</span>
              </div>
              <button onClick={copyCode} className="bg-white/20 hover:bg-white/30 rounded-lg p-2 transition flex items-center gap-1.5 text-sm font-bold flex-shrink-0">
                {codeCopied?<><Check size={15}/>Copied!</>:<><Copy size={15}/>Copy</>}
              </button>
            </div>
          )}
        </div>

        {/* How to join info */}
        <div className="card p-4 border border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--muted)] uppercase mb-2">How to Join</p>
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-brand/10 rounded-lg flex items-center justify-center text-xs font-black text-brand flex-shrink-0 mt-0.5">1</div>
              <p className="text-sm text-[var(--text)]">Friend opens the invite link or goes to <strong>nam-payanam.vercel.app</strong></p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-brand/10 rounded-lg flex items-center justify-center text-xs font-black text-brand flex-shrink-0 mt-0.5">2</div>
              <p className="text-sm text-[var(--text)]">They sign in (or register), then click <strong>Join Trip</strong> on the invite page</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-brand/10 rounded-lg flex items-center justify-center text-xs font-black text-brand flex-shrink-0 mt-0.5">3</div>
              <p className="text-sm text-[var(--text)]">They can also enter the trip code <strong>{tripCode}</strong> from their Home page</p>
            </div>
          </div>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="skeleton h-16"/>)}</div>
        ) : (
          <div className="card divide-y divide-[var(--border)]">
            {members.length===0 ? (
              <div className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-brand/10 rounded-xl flex items-center justify-center"><Crown size={18} className="text-brand"/></div>
                <div>
                  <p className="font-bold text-[var(--text)] text-sm">You (Organizer)</p>
                  <p className="text-[var(--muted)] text-xs">{user?.email}</p>
                </div>
                <span className="badge badge-brand ml-auto">Host</span>
              </div>
            ) : members.map((m:any)=>{
              const isHost=m.user_id===trip?.organizer_id;
              return (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${isHost?'bg-brand/10 text-brand':'bg-[var(--bg)] text-[var(--muted)]'}`}>
                    {isHost?<Crown size={18}/>:<User size={18}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[var(--text)] text-sm truncate">{memberName(m)}</p>
                    <p className="text-[var(--muted)] text-xs capitalize">{m.role?.toLowerCase()}</p>
                  </div>
                  {isHost&&<span className="badge badge-brand">Host</span>}
                  {isOrganizer&&!isHost&&(
                    <button onClick={()=>remove(m.user_id)} className="btn-icon text-rose-500 hover:bg-rose-50 w-8 h-8"><X size={15}/></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
