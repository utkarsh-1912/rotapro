
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AppState, RotaGeneration, Shift, ShiftStreak, TeamMember, AdhocAssignments, WeekendRota } from "./types";
import { startOfWeek, formatISO, parseISO, addDays, eachWeekendOfInterval, isWithinInterval } from "date-fns";
import { generateNewRotaAssignments, balanceAssignments } from "./rotaGenerator";
import { toast } from "@/hooks/use-toast";

const SHIFT_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
];

const getInitialState = (): Omit<AppState, keyof ReturnType<typeof useRotaStoreActions>> => {
    return {
        teamMembers: [],
        shifts: [
          { id: 'apac', name: 'APAC', startTime: '04:00', endTime: '14:00', color: 'var(--chart-1)', sequence: 1, isExtreme: true, minTeam: 1, maxTeam: 10 },
          { id: 'emea', name: 'EMEA', startTime: '13:00', endTime: '23:00', color: 'var(--chart-2)', sequence: 4, isExtreme: false, minTeam: 1, maxTeam: 10 },
          { id: 'us', name: 'US', startTime: '18:00', endTime: '04:00', color: 'var(--chart-3)', sequence: 3, isExtreme: true, minTeam: 1, maxTeam: 10 },
          { id: 'late_emea', name: 'LATE EMEA', startTime: '15:00', endTime: '01:00', color: 'var(--chart-4)', sequence: 2, isExtreme: false, minTeam: 1, maxTeam: 10 }
        ],
        generationHistory: [],
        activeGenerationId: null,
        weekendRotas: [],
        lastWeekendAssigneeIndex: -1,
    }
}


const calculateShiftStreaks = (teamMembers: TeamMember[], generationHistory: RotaGeneration[]): ShiftStreak => {
    const streaks: ShiftStreak = {};
    teamMembers.forEach(member => {
        streaks[member.id] = { shiftId: null, count: 0 };
    });

    if (generationHistory.length === 0) {
        return streaks;
    }

    const sortedHistory = [...generationHistory].sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());
    
    for (const member of teamMembers) {
        let currentStreakCount = 0;
        let lastShiftId: string | null = null;

        // Iterate from most recent to oldest to find the current streak
        for (let i = sortedHistory.length - 1; i >= 0; i--) {
            const gen = sortedHistory[i];
            const memberShiftInGen = gen.assignments[member.id];

            if (i === sortedHistory.length - 1) { // Most recent generation
                lastShiftId = memberShiftInGen || null;
                if(lastShiftId) {
                    currentStreakCount = 1;
                } else {
                    break; // No shift, no streak
                }
            } else {
                if (memberShiftInGen === lastShiftId) {
                    currentStreakCount++;
                } else {
                    break; // Streak is broken
                }
            }
        }
        streaks[member.id] = { shiftId: lastShiftId, count: currentStreakCount };
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
      
      deleteShift: (id: string) => {
        set(state => {
          const { teamMembers, shifts } = state;
          const shiftIsFixed = teamMembers.some(m => m.fixedShiftId === id);

          if (shiftIsFixed) {
              toast({
                  variant: "destructive",
                  title: "Deletion Failed",
                  description: "Cannot delete a shift that is set as a fixed shift for a team member.",
              });
              return state;
          }

          toast({
              title: "Shift Deleted",
              description: `The shift has been successfully deleted.`,
          });

          return {
              shifts: shifts.filter(s => s.id !== id),
          };
        });
      },

      updateAssignmentsForGeneration: (generationId, newAssignments, newComments) => set(state => {
        const { generationHistory } = state;
        if (!generationId) return state;

        const newHistory = generationHistory.map(gen => {
          if (gen.id === generationId) {
            const originalAssignments = gen.assignments;
            const updatedOverrides = new Set(gen.manualOverrides || []);
            
            Object.keys(newAssignments).forEach(memberId => {
              if (newAssignments[memberId] !== originalAssignments[memberId]) {
                updatedOverrides.add(memberId);
              }
            });

            return { 
                ...gen, 
                assignments: newAssignments, 
                comments: newComments,
                manualOverrides: Array.from(updatedOverrides) 
            };
          }
          return gen;
        });

        return { generationHistory: newHistory };
      }),
      
      updateAssignment: (memberId, newShiftId) => {
        set(state => {
            const { activeGenerationId, generationHistory } = state;
            if (!activeGenerationId) return state;

            const newHistory = generationHistory.map(gen => {
                if (gen.id === activeGenerationId) {
                    const newAssignments = { ...gen.assignments, [memberId]: newShiftId };
                    const newOverrides = new Set(gen.manualOverrides || []);
                    newOverrides.add(memberId);
                    return { ...gen, assignments: newAssignments, manualOverrides: Array.from(newOverrides) };
                }
                return gen;
            });
            return { generationHistory: newHistory };
        });
      },

      updateAdhocAssignments: (generationId, adhocAssignments, notes) => set(state => {
        const newHistory = state.generationHistory.map(gen => {
            if (gen.id === generationId) {
                return { ...gen, adhoc: adhocAssignments, comments: notes };
            }
            return gen;
        });
        return { generationHistory: newHistory };
      }),

      generateNewRota: (startDate: Date, rotaPeriodInWeeks: number = 2) => {
        set(state => {
            const { teamMembers, shifts, generationHistory } = state;
            const sortedShifts = [...shifts].sort((a,b) => a.sequence - b.sequence);
            
            const totalMinRequired = sortedShifts.reduce((acc, s) => acc + s.minTeam, 0);
            const flexibleMemberCount = teamMembers.filter(m => !m.fixedShiftId).length;

            if (flexibleMemberCount < totalMinRequired) {
                toast({
                    variant: "destructive",
                    title: "Staffing Warning",
                    description: `Not enough flexible members (${flexibleMemberCount}) to meet total minimum of ${totalMinRequired}. Rota may be unbalanced.`,
                    duration: 6000,
                });
            }

            const newStartDate = startOfWeek(startDate, { weekStartsOn: 1 });
            const periodInDays = rotaPeriodInWeeks * 7;
            const newEndDate = addDays(newStartDate, periodInDays - 1);

            const currentMemberIds = new Set(teamMembers.map(m => m.id));
            const filteredHistory = generationHistory.map(gen => ({
              ...gen,
              assignments: Object.entries(gen.assignments)
                .filter(([memberId]) => currentMemberIds.has(memberId))
                .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
            }));

            const shiftStreaks = calculateShiftStreaks(teamMembers, filteredHistory);

            const initialAssignments = generateNewRotaAssignments(teamMembers, sortedShifts, shiftStreaks);
            
            const finalAssignments = balanceAssignments(initialAssignments, sortedShifts, teamMembers, shiftStreaks);

            const newGeneration: RotaGeneration = {
                id: new Date().getTime().toString(),
                startDate: formatISO(newStartDate),
                endDate: formatISO(newEndDate),
                assignments: finalAssignments,
                teamMembersAtGeneration: [...teamMembers],
                manualOverrides: [],
                manualSwaps: [],
                comments: {},
            };

            const newHistory = [...generationHistory, newGeneration];

            return { 
                generationHistory: newHistory,
                activeGenerationId: newGeneration.id 
            };
        });
      },

      swapShifts: (memberId1, memberId2, generationId) => {
        set(state => {
          const targetGenerationId = generationId || state.activeGenerationId;
          if (!targetGenerationId) return state;

          const newHistory = state.generationHistory.map(gen => {
              if (gen.id === targetGenerationId) {
                  const newAssignments = { ...gen.assignments };
                  const shift1 = newAssignments[memberId1];
                  const shift2 = newAssignments[memberId2];

                  if (shift2 !== undefined) newAssignments[memberId1] = shift2;
                  else delete newAssignments[memberId1];

                  if (shift1 !== undefined) newAssignments[memberId2] = shift1;
                  else delete newAssignments[memberId2];

                  const newOverrides = new Set(gen.manualOverrides || []);
                  newOverrides.add(memberId1);
                  newOverrides.add(memberId2);

                  const newSwaps = [...(gen.manualSwaps || [])];
                  newSwaps.push({ memberId1, memberId2 });
                  
                  return {...gen, assignments: newAssignments, manualOverrides: Array.from(newOverrides), manualSwaps: newSwaps};
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

      generateWeekendRota: (generationId: string) => set(state => {
        const { teamMembers, lastWeekendAssigneeIndex, weekendRotas, generationHistory } = state;
        const targetGeneration = generationHistory.find(g => g.id === generationId);

        if (!targetGeneration) {
            toast({ variant: "destructive", title: "Generation Failed", description: "Target rota period not found." });
            return state;
        }

        const flexibleMembers = (targetGeneration.teamMembersAtGeneration || teamMembers).filter(m => !m.fixedShiftId);
        if (flexibleMembers.length === 0) {
            toast({ variant: "destructive", title: "Generation Failed", description: "No flexible team members available for weekend rota." });
            return state;
        }

        const interval = {
            start: parseISO(targetGeneration.startDate),
            end: parseISO(targetGeneration.endDate),
        };
        const weekends = eachWeekendOfInterval(interval);
        let assigneeIndex = lastWeekendAssigneeIndex;

        const newRotas = weekends.map(weekendDay => {
            assigneeIndex = (assigneeIndex + 1) % flexibleMembers.length;
            return {
                date: formatISO(weekendDay),
                memberId: flexibleMembers[assigneeIndex].id,
                generationId: generationId,
            };
        });
        
        toast({
            title: "Weekend Rota Generated",
            description: `Generated for rota period ${format(interval.start, 'd MMM')} - ${format(interval.end, 'd MMM')}`
        });

        // Remove any old rotas for this same generation period before adding new ones
        const otherRotas = weekendRotas.filter(r => r.generationId !== generationId);

        return {
            weekendRotas: [...otherRotas, ...newRotas],
            lastWeekendAssigneeIndex: assigneeIndex
        }
      }),
      deleteWeekendRotaForPeriod: (generationId: string) => set(state => {
        const remainingRotas = state.weekendRotas.filter(rota => rota.generationId !== generationId);

        toast({
            title: "Weekend Rota Deleted",
            description: `Deleted for the selected period.`
        })

        return { weekendRotas: remainingRotas };
      }),

    }),
    {
      name: "rotapro-storage",
      storage: createJSONStorage(() => localStorage),
       onRehydrateStorage: () => (state) => {
        if (state) {
            // On hydration, ensure endDates exist for old data
            let needsUpdate = false;
            state.generationHistory.forEach(gen => {
                if (!gen.endDate) {
                    needsUpdate = true;
                    const startDate = parseISO(gen.startDate);
                    // Assume old rotas were 2 weeks
                    gen.endDate = formatISO(addDays(startDate, 13));
                }
            });

            if (!state.activeGenerationId && state.generationHistory.length > 0) {
              const sortedHistory = [...state.generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime());
              state.activeGenerationId = sortedHistory[0].id;
            }

            // Ensure lastWeekendAssigneeIndex is a number
            if(typeof state.lastWeekendAssigneeIndex !== 'number') {
                state.lastWeekendAssigneeIndex = -1;
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
    deleteShift: state.deleteShift,
    generateNewRota: state.generateNewRota,
    swapShifts: state.swapShifts,
    deleteGeneration: state.deleteGeneration,
    setActiveGenerationId: state.setActiveGenerationId,
    updateAssignmentsForGeneration: state.updateAssignmentsForGeneration,
    updateAssignment: state.updateAssignment,
    updateAdhocAssignments: state.updateAdhocAssignments,
    generateWeekendRota: state.generateWeekendRota,
    deleteWeekendRotaForPeriod: state.deleteWeekendRotaForPeriod,
}));
