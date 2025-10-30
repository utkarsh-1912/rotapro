import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState, Rota, TeamMember, Shift } from "./types";
import { addDays, format, startOfWeek } from "date-fns";
import { generateNewRota, generateNextRota } from "./rotaGenerator";

const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      teamMembers: [
        { id: "1", name: "Alice Johnson" },
        { id: "2", name: "Bob Williams" },
        { id: "3", name: "Charlie Brown" },
        { id: "4", name: "Diana Miller" },
        { id: "5", name: "Ethan Davis", fixedShiftId: "us" },
        { id: "6", name: "Fiona Garcia" },
      ],
      shifts: [
        { id: "apac", name: "APAC", startTime: "01:00", endTime: "09:00", color: "bg-blue-200" },
        { id: "emea", name: "EMEA", startTime: "08:00", endTime: "16:00", color: "bg-amber-200" },
        { id: "us", name: "US", startTime: "15:00", endTime: "23:00", color: "bg-indigo-200" },
        { id: "late_emea", name: "LATE EMEA", startTime: "12:00", endTime: "20:00", color: "bg-emerald-200" },
      ],
      rota: {},
      startDate: startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString(),

      addTeamMember: (name, fixedShiftId) =>
        set((state) => ({
          teamMembers: [
            ...state.teamMembers,
            { id: new Date().getTime().toString(), name, fixedShiftId },
          ],
        })),

      updateTeamMember: (id, updates) =>
        set((state) => ({
          teamMembers: state.teamMembers.map((member) =>
            member.id === id ? { ...member, ...updates } : member
          ),
        })),

      deleteTeamMember: (id) =>
        set((state) => {
          const newRota = Object.entries(state.rota).reduce((acc, [date, assignments]) => {
              const newAssignments = { ...assignments };
              delete newAssignments[id];
              acc[date] = newAssignments;
              return acc;
          }, {} as Rota);
          return {
            teamMembers: state.teamMembers.filter((member) => member.id !== id),
            rota: newRota,
          };
        }),

      updateShift: (id, newShift) =>
        set((state) => ({
          shifts: state.shifts.map((shift) =>
            shift.id === id ? { ...shift, ...newShift } : shift
          ),
        })),
        
      setRota: (newRota, newStartDate) => set(state => ({
        rota: newRota,
        startDate: newStartDate || state.startDate,
      })),

      generateRota: () => {
        const { teamMembers, shifts, startDate } = get();
        const newRota = generateNewRota(teamMembers, shifts, startDate);
        set({ rota: newRota });
      },

      swapShifts: (memberId1, memberId2) => {
        set(state => {
          const newRota: Rota = JSON.parse(JSON.stringify(state.rota));
          const { startDate } = state;
      
          const member1 = state.teamMembers.find(m => m.id === memberId1);
          const member2 = state.teamMembers.find(m => m.id === memberId2);
      
          if (member1?.fixedShiftId || member2?.fixedShiftId) {
            console.warn("Cannot swap shifts for members with fixed assignments.");
            return state;
          }
      
          // Iterate over all dates in the rota and swap
          for (const date in newRota) {
            const shift1 = newRota[date][memberId1];
            const shift2 = newRota[date][memberId2];

            if (shift2 !== undefined) {
              newRota[date][memberId1] = shift2;
            } else {
              delete newRota[date][memberId1];
            }

            if (shift1 !== undefined) {
              newRota[date][memberId2] = shift1;
            } else {
              delete newRota[date][memberId2];
            }
          }
          return { rota: newRota };
        });
      },

      cloneRota: () => {
        set(state => {
          const { teamMembers, shifts, startDate } = state;
          // generateNextRota now creates a fresh random rota for the next period
          const { newRota, newStartDate } = generateNextRota(teamMembers, shifts, startDate);
          
          return { 
            rota: newRota, 
            startDate: newStartDate
          };
        });
      }

    }),
    {
      name: "rotapro-storage",
      storage: createJSONStorage(() => localStorage),
      reviver: (key, value) => {
        if (key === 'startDate' && typeof value === 'string') {
          try {
            return new Date(value).toISOString();
          } catch (e) {
            return startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
          }
        }
        return value;
      },
      // This function runs on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const today = startOfWeek(new Date(), { weekStartsOn: 1 });
          const rotaStartDate = startOfWeek(new Date(state.startDate), { weekStartsOn: 1 });

          // If the stored rota is from a past period, generate a new one for the current period.
          if (rotaStartDate < today || Object.keys(state.rota).length === 0) {
            const newStartDate = today.toISOString();
            const newRota = generateNewRota(state.teamMembers, state.shifts, newStartDate);
            state.startDate = newStartDate;
            state.rota = newRota;
          }
        }
      }
    }
  )
);

export const useRotaStore = <T>(selector: (state: AppState) => T): T => {
    const state = useStore(selector);
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
      setHydrated(true);
      const unsub = useStore.persist.onRehydrateStorage(() => {
        const { rota, generateRota, teamMembers, startDate } = useStore.getState();
        const today = startOfWeek(new Date(), { weekStartsOn: 1 });
        const rotaStartDate = startOfWeek(new Date(startDate), { weekStartsOn: 1 });

        if (Object.keys(rota).length === 0 && teamMembers.length > 0) {
          generateRota();
        } else if (rotaStartDate < today) {
          // If the rota is for a past week, regenerate for the current week.
           useStore.setState({ startDate: today.toISOString() });
           generateRota();
        }
      });
      
      // Initial check on mount
       const { rota, generateRota, teamMembers, startDate } = useStore.getState();
       if (Object.keys(rota).length === 0 && teamMembers.length > 0) {
           generateRota();
       }

      return () => unsub();
    }, []);

    if (!hydrated) {
        if (selector.toString().includes('startDate')) {
            return startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString() as T;
        }
        const initialState = useStore.getState();
        try {
            const initialValue = selector(initialState);
             if (Array.isArray(initialValue)) return [] as T;
             if (typeof initialValue === 'object' && initialValue !== null) return initialValue;
        } catch (e) {
            // Fallback for complex selectors on initial load
        }
        return ({} as T);
    }
    
    return state;
}

export const useRotaStoreActions = () => useStore(state => ({
    addTeamMember: state.addTeamMember,
    updateTeamMember: state.updateTeamMember,
    deleteTeamMember: state.deleteTeamMember,
    updateShift: state.updateShift,
    setRota: state.setRota,
    generateRota: state.generateRota,
    swapShifts: state.swapShifts,
    cloneRota: state.cloneRota,
}));
