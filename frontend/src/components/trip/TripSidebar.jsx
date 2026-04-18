import { useNavigate } from 'react-router-dom';
import { MemberAvatar, StatusBadge, formatCurrency } from '../ui/index.jsx';

const TAMIL = {
  itinerary: 'திட்டம்',
  expenses:  'செலவுகள்',
  breaks:    'இடைவேளைகள்',
  map:       'வரைபடம்',
  ai:        'AI உதவி',
  members:   'உறுப்பினர்கள்',
  report:    'அறிக்கை',
  share:     'பகிர்',
  delete:    'நீக்கு',
  settings:  'அமைப்புகள்',
};

const NAV_ITEMS = [
  { id:'itinerary', icon:'📅', label:'Plan',       tamil:'திட்டம்'       },
  { id:'expenses',  icon:'💸', label:'Expenses',   tamil:'செலவுகள்'      },
  { id:'breaks',    icon:'☕', label:'Breaks',     tamil:'இடைவேளை'       },
  { id:'map',       icon:'🗺️', label:'Map',        tamil:'வரைபடம்'       },
  { id:'ai',        icon:'🤖', label:'AI Assist',  tamil:'AI உதவி'       },
  { id:'report',    icon:'📊', label:'Report',     tamil:'அறிக்கை'       },
];

export default function TripSidebar({
  isOpen, onClose, activeTab, setActiveTab,
  trip, members, session, expenses,
  onShare, onDelete, lang, setLang
}) {
  const navigate = useNavigate();
  const totalSpent = expenses?.reduce((s,e)=>s+parseFloat(e.amount),0)||0;
  const isOrg = session?.isOrganizer;

  function nav(id) { setActiveTab(id); onClose(); }

  return (
    <>
      {isOpen && <div className="sidebar-overlay animate-fade-in" onClick={onClose}/>}
      <div className={`sidebar-panel pt-safe transition-transform duration-300 ${isOpen?'translate-x-0':'-translate-x-full'}z-1000`}>

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 px-5 pt-5 pb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🗺️</span>
              <div>
                <div className="font-display font-black text-white text-base leading-tight">Nam Payanam</div>
                <div className="font-tamil text-indigo-300 text-xs">நம் பயணம்</div>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-white/15 rounded-xl flex items-center justify-center active:bg-white/25">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Trip info */}
          <div className="bg-white/10 rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={trip?.status}/>
              {isOrg && <span className="badge badge-gold text-[10px]">★ Organiser</span>}
            </div>
            <h2 className="font-display font-black text-white text-sm truncate">{trip?.title}</h2>
            <p className="text-indigo-300 text-xs mt-0.5 truncate">
              {trip?.start_location?.split(',')[0]} → {trip?.end_location?.split(',')[0]}
            </p>
            <div className="flex items-center justify-between mt-2">
              <span className="text-indigo-300 text-xs">{members?.length}/{trip?.group_size} members</span>
              <span className="font-bold text-saffron-400 text-sm">{formatCurrency(totalSpent)} spent</span>
            </div>
          </div>

          {/* Me */}
          <div className="flex items-center gap-3 mt-3">
            <MemberAvatar nickname={session?.nickname} isOrganizer={isOrg} size="md"/>
            <div>
              <div className="text-white font-bold text-sm">{session?.nickname}</div>
              <div className="text-indigo-300 text-xs">{isOrg?'Organiser':'Member'}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => nav(item.id)}
              className={`nav-item w-full text-left ${activeTab===item.id?'nav-item-active':'nav-item-idle'}`}>
              <span className="text-xl w-7 text-center">{item.icon}</span>
              <div className="flex-1">
                <div className="font-bold text-sm">{item.label}</div>
                <div className="font-tamil text-[11px] opacity-60">{item.tamil}</div>
              </div>
              {activeTab===item.id && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"/>}
            </button>
          ))}

          <div className="h-px bg-slate-100 my-2"/>

          {/* Share */}
          <button onClick={()=>{onShare();onClose();}} className="nav-item w-full text-left nav-item-idle">
            <span className="text-xl w-7 text-center">🔗</span>
            <div className="flex-1">
              <div className="font-bold text-sm">Share Trip</div>
              <div className="font-tamil text-[11px] opacity-60">பகிரவும்</div>
            </div>
          </button>

          {/* Lang toggle */}
          <button onClick={()=>setLang(lang==='en'?'ta':'en')} className="nav-item w-full text-left nav-item-idle">
            <span className="text-xl w-7 text-center">🌐</span>
            <div className="flex-1">
              <div className="font-bold text-sm">{lang==='en'?'Switch to Tamil':'English-க்கு மாறு'}</div>
              <div className={`text-[11px] opacity-60 ${lang==='ta'?'font-tamil':''}`}>{lang==='en'?'தமிழில் காண்க':'View in English'}</div>
            </div>
          </button>

          {/* Home */}
          <button onClick={()=>navigate('/')} className="nav-item w-full text-left nav-item-idle">
            <span className="text-xl w-7 text-center">🏠</span>
            <div className="flex-1">
              <div className="font-bold text-sm">Home</div>
              <div className="font-tamil text-[11px] opacity-60">முகப்பு</div>
            </div>
          </button>

          {/* Delete — organiser only */}
          {isOrg && (
            <>
              <div className="h-px bg-slate-100 my-2"/>
              <button onClick={()=>{onDelete();onClose();}} className="nav-item w-full text-left nav-item-danger">
                <span className="text-xl w-7 text-center">🗑️</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Delete Trip</div>
                  <div className="font-tamil text-[11px] opacity-60">பயணத்தை நீக்கு</div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100">
          <div className="text-center">
            <div className="font-tamil text-slate-400 text-[11px]">நம் பயணம் — உங்கள் பயண தோழன்</div>
            <div className="text-slate-300 text-[10px] mt-0.5">Your Smart Travel Companion</div>
          </div>
        </div>
      </div>
    </>
  );
}
