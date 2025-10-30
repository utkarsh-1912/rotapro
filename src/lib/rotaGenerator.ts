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

// US -> EMEA -> APAC -> LATE EMEA -> US
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

  // 2. Members who MUST rotate
  const mustRotateMembers = rotatingMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    if (!streak || !streak.shiftId) return false;

    // New rule: Force rotation from APAC or US after 1 period (2 weeks)
    if ((streak.shiftId === 'apac' || streak.shiftId === 'us') && streak.count >= 1) {
      return true;
    }

    // Original rule: Force rotation from any shift after 2 periods (4 weeks)
    return streak.count >= 2;
  });

  mustRotateMembers.forEach(member => {
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const nextShiftId = getNextShiftId(lastShiftId);
    assignments[member.id] = nextShiftId;
    assignedShiftCounts[nextShiftId]++;
  });

  // 3. Members who CAN rotate (not part of mustRotate)
  let remainingMembers = rotatingMembers.filter(m => !mustRotateMembers.some(mr => mr.id === m.id));

  // 4. Assign members who continue their current shift (if streak < 2, or < 1 for APAC/US)
  const continuingMembers = remainingMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    return streak && streak.shiftId && !assignments[m.id];
  });
  
  continuingMembers.forEach(member => {
    const currentShiftId = shiftStreaks[member.id].shiftId!;
    assignments[member.id] = currentShiftId;
    assignedShiftCounts[currentShiftId]++;
  });
  
  remainingMembers = remainingMembers.filter(m => !continuingMembers.some(cm => cm.id === m.id));

  // 5. Assign members starting a new rotation
  remainingMembers.forEach(member => {
    const nextShiftId = getNextShiftId(shiftStreaks[member.id]?.shiftId);
    assignments[member.id] = nextShiftId;
    assignedShiftCounts[nextShiftId]++;
  });


  // 6. Balance assignments to meet constraints (This is a fallback, ideal state is already met)
  // This part is complex and might need a more sophisticated algorithm if the above logic fails.
  // For now, we assume the rotation logic is the primary driver of assignments.
  // The following is a simplified check/balance.
  const shiftsToFill: { shiftId: string, min: number, max: number }[] = [
    { shiftId: 'apac', min: 1, max: 1 },
    { shiftId: 'us', min: 1, max: 1 },
    { shiftId: 'emea', min: 1, max: 2 },
  ];
  
  // This is a naive re-balancing and might not be perfect. A proper solver would be needed for complex cases.
  // If a shift is over-assigned, try to move someone to a shift that is under-assigned.
  shiftsToFill.forEach(({shiftId, max}) => {
      if (assignedShiftCounts[shiftId] > max) {
          const membersOnShift = Object.keys(assignments).filter(memberId => assignments[memberId] === shiftId && !teamMembers.find(m => m.id === memberId)?.fixedShiftId);
          
          const membersToMove = shuffle(membersOnShift).slice(0, assignedShiftCounts[shiftId] - max);

          membersToMove.forEach(memberId => {
              // Try to find an under-filled shift. 'late_emea' is the default catch-all.
              const lateEmeaCount = assignedShiftCounts['late_emea'] || 0;
              const emeaCount = assignedShiftCounts['emea'] || 0;
              let targetShift = 'late_emea'; // Default fallback

              const emeaShift = shiftsToFill.find(s => s.shiftId === 'emea');
              if (emeaShift && emeaCount < emeaShift.max) {
                targetShift = 'emea';
              }
              
              assignments[memberId] = targetShift;
              assignedShiftCounts[shiftId]--;
              assignedShiftCounts[targetShift]++;
          });
      }
  });


  return assignments;
};
