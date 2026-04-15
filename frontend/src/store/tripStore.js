import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useTripStore = create(
  persist(
    (set, get) => ({
      // Current user session (stored locally)
      session: null, // { memberId, nickname, tripId, tripCode, isOrganizer }
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),

      // Active trip data (from server)
      trip: null,
      members: [],
      days: [],
      progress: null,
      expenses: [],
      settlements: null,

      setTrip: (trip) => set({ trip }),
      setMembers: (members) => set({ members }),
      setDays: (days) => set({ days }),
      setProgress: (progress) => set({ progress }),
      setExpenses: (expenses) => set({ expenses }),
      setSettlements: (settlements) => set({ settlements }),

      setTripData: ({ trip, members, days, progress }) =>
        set({ trip, members, days, progress }),

      clearTrip: () => set({ trip: null, members: [], days: [], progress: null, expenses: [], settlements: null }),

      // UI state
      activeDay: 0,
      setActiveDay: (day) => set({ activeDay: day }),

      // Computed helpers
      getMemberByNickname: (nickname) => get().members.find(m => m.nickname === nickname),
      getDayExpenses: (dayNumber) => get().expenses.filter(e => e.day_number === dayNumber),
      getTotalSpent: () => get().expenses.reduce((s, e) => s + parseFloat(e.amount), 0),
      getProgressPercent: () => {
        const { trip, progress, days } = get();
        if (!trip || !progress) return 0;
        const totalStops = days.reduce((s, d) => s + (d.stops?.length || 0), 0);
        if (!totalStops) return 0;
        return Math.round((progress.current_stop_index / totalStops) * 100);
      },
    }),
    {
      name: 'nam-payanam-storage',
      partialize: (state) => ({ session: state.session }),
    }
  )
);
