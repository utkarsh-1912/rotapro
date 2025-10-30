import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState, RotaGeneration, Shift, ShiftStreak, TeamMember } from "./types";
import { startOfWeek, formatISO, parseISO } from "date-fns";
import { generateNewRotaAssignments } from "./rotaGenerator";

const SHIFT_COLORS = [
    'bg-blue-200',
    'bg-amber-200',
    'bg-indigo-200',
    'bg-emerald-200',
    'bg-rose-200',
    'bg-pink-200',
    'bg-purple-200',
];

const getInitialState = (): Omit<AppState, keyof ReturnType<typeof useRotaStoreActions>> => {
    return {
        teamMembers: [],
        shifts: [
          { id: 'apac', name: 'APAC', startTime: '04:00', endTime: '14:00', color: 'bg-blue-200', sequence: 1, isExtreme: true, minTeam: 1, maxTeam: 10 },
          { id: 'emea', name: 'EMEA', startTime: '13:00', endTime: '23:00', color: 'bg-amber-200', sequence: 2, isExtreme: false, minTeam: 1, maxTeam: 10 },
          { id: 'us', name: 'US', startTime: '18:00', endTime: '04:00', color: 'bg-indigo-200', sequence: 3, isExtreme: true, minTeam: 1, maxTeam: 10 },
          { id: 'late_emea', name: 'LATE EMEA', startTime: '15:00', endTime: '01:00', color: 'bg-emerald-200', sequence: 4, isExtreme: false, minTeam: 1, maxTeam: 10 }
        ],
        generationHistory: [],
        activeGenerationId: null,
    }
}


const calculateShiftStreaks = (teamMembers: TeamMember[], generationHistory: RotaGeneration[]): ShiftStreak => {
    const streaks: ShiftStreak = {};
    // Initialize streaks for all members
    teamMembers.forEach(member => {
        streaks[member.id] = { shiftId: null, count: 0 };
    });

    // Sort history from most recent to oldest
    const sortedHistory = [...generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
    
    if (sortedHistory.length === 0) {
        return streaks;
    }

    for (const member of teamMembers) {
        const lastGenAssignment = sortedHistory[0].assignments[member.id];
        if (!lastGenAssignment) {
            streaks[member.id] = { shiftId: null, count: 0 };
            continue;
        }

        let streakCount = 0;
        for (const generation of sortedHistory) {
            if (generation.assignments[member.id] === lastGenAssignment) {
                streakCount++;
            } else {
                break; // Streak is broken
            }
        }
        streaks[member.id] = { shiftId: lastGenAssignment, count: streakCount };
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
        set((state) => ({
          teamMembers: state.teamMembers.filter((member) => member.id !== id),
        })),
      
      addShift: (newShiftData) =>
        set((state) => {
          const newShift: Shift = {
            id: new Date().getTime().toString(),
            ...newShiftData,
            color: SHIFT_COLORS[state.shifts.length % SHIFT_COLORS.length],
          };
          return {
            shifts: [...state.shifts, newShift],
          };
        }),

      updateShift: (id, newShift) =>
        set((state) => ({
          shifts: state.shifts.map((shift) =>
            shift.id === id ? { ...shift, ...newShift } : shift
          ),
        })),

      updateAssignment: (memberId, shiftId) => set(state => {
        const { activeGenerationId, generationHistory } = state;
        if (!activeGenerationId) return state;

        const newHistory = generationHistory.map(gen => {
          if (gen.id === activeGenerationId) {
            const newAssignments = { ...gen.assignments };
            newAssignments[memberId] = shiftId;
            return { ...gen, assignments: newAssignments };
          }
          return gen;
        });

        return { generationHistory: newHistory };
      }),
        
      generateNewRota: (startDate: Date) => {
        set(state => {
            let { teamMembers, shifts, generationHistory } = state;
            
            const newStartDate = startOfWeek(startDate, { weekStartsOn: 1 });

            // Update lastShiftId for each member based on the most recent generation
            if (generationHistory.length > 0) {
              const latestGeneration = [...generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())[0];
              teamMembers = teamMembers.map(m => ({
                ...m,
                lastShiftId: latestGeneration.assignments[m.id],
              }));
            }

            const shiftStreaks = calculateShiftStreaks(teamMembers, generationHistory);

            const newAssignments = generateNewRotaAssignments(teamMembers, shifts, shiftStreaks);
            
            const newGeneration: RotaGeneration = {
                id: new Date().getTime().toString(),
                startDate: formatISO(newStartDate),
                assignments: newAssignments,
                teamMembersAtGeneration: [...teamMembers] // Preserve state of team
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
                newActiveId = newHistory.length > 0 ? [...newHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())[0].id : null;
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
            if (!state.activeGenerationId && state.generationHistory.length > 0) {
              // If activeGenerationId is somehow null but history exists, set it to the latest.
              const sortedHistory = [...state.generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
              state.activeGenerationId = sortedHistory[0].id;
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
    addShift: state.addShift,
    updateShift: state.updateShift,
    generateNewRota: state.generateNewRota,
    swapShifts: state.swapShifts,
    deleteGeneration: state.deleteGeneration,
    setActiveGenerationId: state.setActiveGenerationId,
    updateAssignment: state.updateAssignment
}));
