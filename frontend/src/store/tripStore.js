import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTripStore = create(
  persist(
    (set, get) => ({
      session: null,   // { memberId, memberRowId, nickname, tripId, tripCode, isOrganizer }
      trip: null, members: [], days: [], progress: null,
      expenses: [], breaks: [], settlements: null, activeDay: 0,

      setSession: (s) => set({ session: s }),
      // NEVER auto-clear — only explicit actions clear state
      clearSession: () => set({ session: null }),
      clearTrip: () => set({ trip:null, members:[], days:[], progress:null, expenses:[], breaks:[], settlements:null }),

      setTrip: (t) => set({ trip: t }),
      setTripData: ({ trip, members, days, progress }) => set({ trip, members, days, progress }),
      setMembers: (m) => set({ members: m }),
      setDays: (d) => set({ days: d }),
      setProgress: (p) => set({ progress: p }),
      setExpenses: (e) => set({ expenses: e }),
      setBreaks: (b) => set({ breaks: b }),
      setSettlements: (s) => set({ settlements: s }),
      setActiveDay: (d) => set({ activeDay: d }),

      getTotalSpent: () => get().expenses.reduce((s,e) => s+parseFloat(e.amount), 0),
      getProgressPercent: () => {
        const { days, progress } = get();
        const total = days.reduce((s,d) => s+(d.stops?.length||0), 0);
        if (!total || !progress) return 0;
        return Math.min(100, Math.round((progress.current_stop_index/total)*100));
      },
    }),
    {
      name: 'np-store-v2',
      partialize: (s) => ({ session: s.session }),  // only persist session
    }
  )
);
