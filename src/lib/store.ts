
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState } from "./types";
import { startOfWeek } from "date-fns";
import { generateNewRota, generateNextRota } from "./rotaGenerator";

export const useRotaStore = create<AppState>()(
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
          const newRota = { ...state.rota };
          // This simplified logic assumes we just need to remove the member,
          // a full regeneration might be needed in a real app.
          Object.keys(newRota).forEach(date => {
            delete newRota[date][id];
          });
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
          const newRota = JSON.parse(JSON.stringify(state.rota));
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
      // This function runs on rehydration
      onRehydrateStorage: () => (state) => {
        if (state) {
          const today = startOfWeek(new Date(), { weekStartsOn: 1 });
          const rotaStartDate = state.startDate ? startOfWeek(new Date(state.startDate), { weekStartsOn: 1 }) : new Date(0);

          // If the stored rota is from a past period, or is empty, generate a new one.
          if (rotaStartDate.getTime() < today.getTime() || Object.keys(state.rota).length === 0) {
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

export const useRotaStoreActions = () => useRotaStore(state => ({
    addTeamMember: state.addTeamMember,
    updateTeamMember: state.updateTeamMember,
    deleteTeamMember: state.deleteTeamMember,
    updateShift: state.updateShift,
    setRota: state.setRota,
    generateRota: state.generateRota,
    swapShifts: state.swapShifts,
    cloneRota: state.cloneRota,
}));
