import type { TeamMember, Shift, RotaAssignments, ShiftStreak } from "./types";

function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

const SHIFT_ORDER: string[] = ['us', 'emea', 'apac', 'late_emea'];

const getNextShiftId = (currentShiftId: string | null): string => {
  if (!currentShiftId) return SHIFT_ORDER[0];
  const currentIndex = SHIFT_ORDER.indexOf(currentShiftId);
  const nextIndex = (currentIndex + 1) % SHIFT_ORDER.length;
  return SHIFT_ORDER[nextIndex];
}

export const generateNewRotaAssignments = (
  teamMembers: TeamMember[],
  shifts: Shift[],
  shiftStreaks: ShiftStreak
): RotaAssignments => {
  const assignments: RotaAssignments = {};
  
  // 1. Handle fixed shift members
  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  fixedShiftMembers.forEach(member => {
    if (member.fixedShiftId) {
      assignments[member.id] = member.fixedShiftId;
    }
  });

  const rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);
  const assignedShiftCounts: Record<string, number> = {};
  shifts.forEach(s => assignedShiftCounts[s.id] = 0);
  fixedShiftMembers.forEach(m => {
    if(m.fixedShiftId) assignedShiftCounts[m.fixedShiftId]++;
  });

  // 2. Members who MUST rotate (streak > 1, which means 4 weeks)
  const mustRotateMembers = rotatingMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    return streak && streak.count >= 2;
  });

  mustRotateMembers.forEach(member => {
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const nextShiftId = getNextShiftId(lastShiftId);
    assignments[member.id] = nextShiftId;
    assignedShiftCounts[nextShiftId]++;
  });

  // 3. Members who CAN rotate (not part of mustRotate)
  let remainingMembers = rotatingMembers.filter(m => !mustRotateMembers.some(mr => mr.id === m.id));

  // 4. Assign based on constraints, respecting rotation order
  const shiftsToFill: { shiftId: string, min: number, max: number }[] = [
    { shiftId: 'apac', min: 1, max: 1 },
    { shiftId: 'us', min: 1, max: 1 },
    { shiftId: 'emea', min: 1, max: 2 },
  ];

  shiftsToFill.forEach(({ shiftId, min, max }) => {
    let currentCount = assignedShiftCounts[shiftId] || 0;
    
    // Find members whose natural next shift is this one
    const eligibleMembers = remainingMembers.filter(m => {
      const lastShiftId = shiftStreaks[m.id]?.shiftId;
      const nextShiftId = getNextShiftId(lastShiftId);
      return nextShiftId === shiftId && !assignments[m.id];
    });

    const membersToAssign = shuffle(eligibleMembers).slice(0, max - currentCount);
    
    membersToAssign.forEach(member => {
      assignments[member.id] = shiftId;
      assignedShiftCounts[shiftId]++;
      remainingMembers = remainingMembers.filter(m => m.id !== member.id);
    });
  });

  // 5. Fill minimums if not met, from any remaining members
  shiftsToFill.forEach(({ shiftId, min }) => {
    let currentCount = assignedShiftCounts[shiftId] || 0;
    if (currentCount < min) {
      const membersToAssign = shuffle(remainingMembers).slice(0, min - currentCount);
      membersToAssign.forEach(member => {
        assignments[member.id] = shiftId;
        assignedShiftCounts[shiftId]++;
        remainingMembers = remainingMembers.filter(m => m.id !== member.id);
      });
    }
  });
  
  // 6. Assign all other remaining members to late_emea
  shuffle(remainingMembers).forEach(member => {
    if (!assignments[member.id]) {
      assignments[member.id] = 'late_emea';
      assignedShiftCounts['late_emea']++;
    }
  });

  return assignments;
};
