import React from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState, Rota, TeamMember } from "./types";
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
        const { teamMembers, startDate } = get();
        const newRota = generateNewRota(teamMembers, startDate);
        set({ rota: newRota });
      },

      swapShifts: (date, memberId1, memberId2) => {
        set(state => {
          const newRota = JSON.parse(JSON.stringify(state.rota));
          const member1 = state.teamMembers.find(m => m.id === memberId1);
          const member2 = state.teamMembers.find(m => m.id === memberId2);

          // Prevent swapping if either member has a fixed shift
          if (member1?.fixedShiftId || member2?.fixedShiftId) {
              // Optionally, show a toast notification here to inform the user
              console.warn("Cannot swap shifts for members with fixed assignments.");
              return state;
          }

          if (newRota[date]) {
            const shift1 = newRota[date][memberId1];
            const shift2 = newRota[date][memberId2];
            
            if (shift1 === undefined && shift2 === undefined) return state; // both are off, nothing to swap

            newRota[date][memberId1] = shift2;
            newRota[date][memberId2] = shift1;

            // Clean up undefined assignments to avoid cluttering the state
            if (newRota[date][memberId1] === undefined) delete newRota[date][memberId1];
            if (newRota[date][memberId2] === undefined) delete newRota[date][memberId2];
            
            return { rota: newRota };
          }
          return state;
        });
      },

      cloneRota: () => {
        set(state => {
          const { rota, teamMembers, startDate } = state;
          const { newRota, newStartDate } = generateNextRota(rota, teamMembers, startDate);
          
          return { rota: { ...rota, ...newRota }, startDate: newStartDate };
        });
      }

    }),
    {
      name: "rotapro-storage",
      storage: createJSONStorage(() => localStorage),
       // This part is important for handling Date objects from JSON
      reviver: (key, value) => {
        if (key === 'startDate' && typeof value === 'string') {
          return new Date(value).toISOString();
        }
        return value;
      },
    }
  )
);

// Custom hook to handle client-side state hydration
export const useRotaStore = <T>(selector: (state: AppState) => T): T => {
    const state = useStore(selector);
    const [hydrated, setHydrated] = React.useState(false);
    React.useEffect(() => {
      setHydrated(true);
      // Automatically generate rota on first load if it's empty
      const { rota, generateRota } = useStore.getState();
      if (Object.keys(rota).length === 0) {
        generateRota();
      }
    }, []);

    // On the server or before hydration, return a default state.
    // This prevents hydration mismatches.
    if (!hydrated) {
        if (selector.toString().includes('startDate')) {
            // Special handling for startDate to avoid server/client mismatch
            return startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString() as T;
        }
        const initialState = useStore.getState();
        const initialValue = selector(initialState);
        // For arrays, return empty array to prevent rendering server-data on client
        if (Array.isArray(initialValue)) return [] as T;

        return initialValue;
    }
    
    return state;
}

// This part is for actions that don't need to be reactive and can be called anywhere
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
