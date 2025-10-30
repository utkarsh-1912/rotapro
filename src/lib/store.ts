import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState, RotaGeneration, ShiftStreak, TeamMember } from "./types";
import { startOfWeek, addDays, format, parseISO } from "date-fns";
import { generateNewRotaAssignments } from "./rotaGenerator";

const getInitialState = () => {
    const startDate = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
    const initialGeneration: RotaGeneration = {
        id: new Date().getTime().toString(),
        startDate: startDate,
        assignments: {}
    };
    return {
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
        generationHistory: [initialGeneration],
        activeGenerationId: initialGeneration.id,
    }
}


const calculateShiftStreaks = (teamMembers: TeamMember[], generationHistory: RotaGeneration[]): ShiftStreak => {
    const streaks: ShiftStreak = {};
    teamMembers.forEach(member => {
        streaks[member.id] = { shiftId: '', count: 0 };
    });

    // Iterate backwards through history
    for (let i = generationHistory.length - 1; i >= 0; i--) {
        const generation = generationHistory[i];
        for (const member of teamMembers) {
            const shiftId = generation.assignments[member.id];
            if (shiftId) {
                // If we are starting the count for this member
                if (streaks[member.id].count === i - generationHistory.length +1 ) {
                    if (streaks[member.id].shiftId === '' || streaks[member.id].shiftId === shiftId) {
                       streaks[member.id].shiftId = shiftId;
                       streaks[member.id].count++;
                    }
                }
            }
        }
    }
    return streaks;
};

export const useRotaStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...getInitialState(),

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
            const newHistory = state.generationHistory.map(gen => {
                const newAssignments = {...gen.assignments};
                delete newAssignments[id];
                return {...gen, assignments: newAssignments};
            });
            return {
                teamMembers: state.teamMembers.filter((member) => member.id !== id),
                generationHistory: newHistory,
            };
        }),

      updateShift: (id, newShift) =>
        set((state) => ({
          shifts: state.shifts.map((shift) =>
            shift.id === id ? { ...shift, ...newShift } : shift
          ),
        })),
        
      generateNewRota: (isNextPeriod = false) => {
        set(state => {
            const { teamMembers, shifts, generationHistory, activeGenerationId } = state;
            
            const lastGeneration = generationHistory[generationHistory.length - 1];
            const currentStartDate = lastGeneration ? lastGeneration.startDate : startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
            
            const newStartDate = isNextPeriod
              ? format(addDays(parseISO(currentStartDate), 14), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
              : startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

            const shiftStreaks = calculateShiftStreaks(teamMembers, generationHistory);

            const newAssignments = generateNewRotaAssignments(teamMembers, shifts, shiftStreaks);
            
            const newGeneration: RotaGeneration = {
                id: new Date().getTime().toString(),
                startDate: newStartDate,
                assignments: newAssignments
            };

            const newHistory = [...generationHistory, newGeneration];

            return { 
                generationHistory: newHistory,
                activeGenerationId: newGeneration.id 
            };
        });
      },

      swapShifts: (memberId1, memberId2) => {
        set(state => {
          const { activeGenerationId, generationHistory } = state;
          if (!activeGenerationId) return state;

          const newHistory = generationHistory.map(gen => {
              if (gen.id === activeGenerationId) {
                  const newAssignments = JSON.parse(JSON.stringify(gen.assignments));
                  const shift1 = newAssignments[memberId1];
                  const shift2 = newAssignments[memberId2];

                  if (shift2 !== undefined) newAssignments[memberId1] = shift2;
                  else delete newAssignments[memberId1];

                  if (shift1 !== undefined) newAssignments[memberId2] = shift1;
                  else delete newAssignments[memberId2];
                  
                  return {...gen, assignments: newAssignments};
              }
              return gen;
          });

          return { generationHistory: newHistory };
        });
      },
      
      deleteGeneration: (generationId: string) => {
        set(state => {
            const newHistory = state.generationHistory.filter(g => g.id !== generationId);
            let newActiveId = state.activeGenerationId;
            if (state.activeGenerationId === generationId) {
                newActiveId = newHistory.length > 0 ? newHistory[newHistory.length - 1].id : null;
            }
            return {
                generationHistory: newHistory,
                activeGenerationId: newActiveId,
            }
        });
      },

      setActiveGenerationId: (generationId: string | null) => {
          set({ activeGenerationId: generationId });
      },

    }),
    {
      name: "rotapro-storage",
      storage: createJSONStorage(() => localStorage),
       onRehydrateStorage: () => (state) => {
        if (state) {
            const initialData = getInitialState();
            if (state.generationHistory.length === 0 || !state.activeGenerationId) {
                const newAssignments = generateNewRotaAssignments(state.teamMembers, state.shifts, {});
                const newGeneration: RotaGeneration = {
                    ...initialData.generationHistory[0],
                    assignments: newAssignments
                };
                state.generationHistory = [newGeneration];
                state.activeGenerationId = newGeneration.id;
            } else {
                 const activeGen = state.generationHistory.find(g => g.id === state.activeGenerationId);
                 if (!activeGen) {
                     state.activeGenerationId = state.generationHistory[state.generationHistory.length - 1].id;
                 }
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
    generateNewRota: state.generateNewRota,
    swapShifts: state.swapShifts,
    deleteGeneration: state.deleteGeneration,
    setActiveGenerationId: state.setActiveGenerationId
}));
