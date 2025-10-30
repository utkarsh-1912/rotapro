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
      
          // Iterate over the 14 days of the current rota period
          for (let i = 0; i < 14; i++) {
            const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
      
            if (newRota[date]) {
              const shift1 = newRota[date][memberId1];
              const shift2 = newRota[date][memberId2];
      
              // Perform the swap for the day
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
          }
          return { rota: newRota };
        });
      },

      cloneRota: () => {
        set(state => {
          const { rota, teamMembers, shifts, startDate } = state;
          const { newRota, newStartDate } = generateNextRota(rota, teamMembers, shifts, startDate);
          
          const combinedRota = { ...rota, ...newRota };
          
          const today = new Date().toISOString().split('T')[0];
          const firstDateOfNewRota = Object.keys(newRota).sort()[0];

          // If the new rota starts in the future, we keep the old start date until we reach it.
          // Otherwise, we update the view to show the new rota period.
          const finalStartDate = !firstDateOfNewRota || today < firstDateOfNewRota ? startDate : newStartDate;

          return { 
            rota: combinedRota, 
            startDate: finalStartDate 
          };
        });
      }

    }),
    {
      name: "rotapro-storage",
      storage: createJSONStorage(() => localStorage),
      reviver: (key, value) => {
        if (key === 'startDate' && typeof value === 'string') {
          return new Date(value).toISOString();
        }
        return value;
      },
    }
  )
);

export const useRotaStore = <T>(selector: (state: AppState) => T): T => {
    const state = useStore(selector);
    const [hydrated, setHydrated] = React.useState(false);

    React.useEffect(() => {
      setHydrated(true);
      const { rota, generateRota, teamMembers } = useStore.getState();
      if (Object.keys(rota).length === 0 && teamMembers.length > 0) {
        generateRota();
      }
    }, []);

    if (!hydrated) {
        if (selector.toString().includes('startDate')) {
            return startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString() as T;
        }
        const initialState = useStore.getState();
        try {
            const initialValue = selector(initialState);
             if (Array.isArray(initialValue)) return [] as T;
             if (typeof initialValue === 'object' && initialValue !== null && Object.keys(initialValue).length === 0) return {} as T;
            return initialValue;
        } catch (e) {
            // Fallback for complex selectors on initial load
        }
        return {} as T;
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
