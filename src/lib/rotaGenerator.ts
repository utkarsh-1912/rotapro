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
  if (currentIndex === -1) return SHIFT_ORDER[0]; // Fallback
  const nextIndex = (currentIndex + 1) % SHIFT_ORDER.length;
  return SHIFT_ORDER[nextIndex];
}

export const generateNewRotaAssignments = (
  teamMembers: TeamMember[],
  shifts: Shift[],
  shiftStreaks: ShiftStreak
): RotaAssignments => {
  const assignments: RotaAssignments = {};
  let unassignedMembers = teamMembers.filter(m => !m.fixedShiftId);

  // 1. Handle fixed shift members
  teamMembers.filter(m => m.fixedShiftId).forEach(member => {
    assignments[member.id] = member.fixedShiftId!;
  });

  // 2. Members who MUST rotate (APAC/US after 1 period, others after 2)
  const mustRotateMembers = unassignedMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    if (!streak || !streak.shiftId) return false;
    
    // Stricter rule for APAC/US: rotate after 1 period
    if ((streak.shiftId === 'apac' || streak.shiftId === 'us') && streak.count >= 1) {
        return true;
    }
    // Standard rule for other shifts: rotate after 2 periods
    return streak.count >= 2;
  });

  mustRotateMembers.forEach(member => {
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const nextShiftId = getNextShiftId(lastShiftId);
    assignments[member.id] = nextShiftId;
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 3. Try to continue streaks for members who don't have to rotate
  const continuingMembers = unassignedMembers.filter(m => {
      const streak = shiftStreaks[m.id];
      if (!streak || !streak.shiftId) return false;
      if ((streak.shiftId === 'apac' || streak.shiftId === 'us')) return false; // Don't continue APAC/US
      return streak.count < 2;
  });

  continuingMembers.forEach(member => {
      const currentShiftId = shiftStreaks[member.id].shiftId!;
      assignments[member.id] = currentShiftId;
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 4. Fill required shifts (APAC, US) from the remaining pool
  const requiredShifts = ['apac', 'us'];
  requiredShifts.forEach(shiftId => {
    const assignedCount = Object.values(assignments).filter(s => s === shiftId).length;
    if (assignedCount < 1 && unassignedMembers.length > 0) {
      // Find someone who wasn't just on an APAC/US shift if possible to avoid back-to-back high-demand shifts
      let memberToAssign = unassignedMembers.find(m => {
        const lastShift = shiftStreaks[m.id]?.shiftId;
        // Should not have been on APAC if we are assigning US, and vice versa
        return (shiftId === 'us' && lastShift !== 'apac') || (shiftId === 'apac' && lastShift !== 'us');
      });
      
      if (!memberToAssign) memberToAssign = unassignedMembers[0]; // fallback if everyone was on a conflicting shift

      assignments[memberToAssign.id] = shiftId;
      unassignedMembers = unassignedMembers.filter(m => m.id !== memberToAssign!.id);
    }
  });

  // 5. Fill EMEA shift
  const emeaAssignedCount = Object.values(assignments).filter(s => s === 'emea').length;
  if (emeaAssignedCount < 1 && unassignedMembers.length > 0) {
      let memberToAssign = unassignedMembers.find(m => shiftStreaks[m.id]?.shiftId !== 'emea');
      if (!memberToAssign) memberToAssign = unassignedMembers[0];

      assignments[memberToAssign.id] = 'emea';
      unassignedMembers = unassignedMembers.filter(m => m.id !== memberToAssign!.id);
  }

  // 6. Assign all remaining members following the rotation order
  shuffle(unassignedMembers).forEach(member => {
    assignments[member.id] = 'late_emea'; // Default remaining to LATE EMEA
  });
  
  // Final balancing pass to ensure minimums are met
  const finalCounts = Object.values(assignments).reduce((acc, shiftId) => {
    if(shiftId) acc[shiftId] = (acc[shiftId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  ['apac', 'us', 'emea'].forEach(shiftId => {
    if ((finalCounts[shiftId] || 0) < 1) {
      // Find someone from LATE EMEA to move
      const memberToMove = Object.keys(assignments).find(memberId => 
        assignments[memberId] === 'late_emea' && !teamMembers.find(m => m.id === memberId)?.fixedShiftId
      );
      if (memberToMove) {
        assignments[memberToMove] = shiftId;
        finalCounts[shiftId] = (finalCounts[shiftId] || 0) + 1;
        finalCounts['late_emea'] = (finalCounts['late_emea'] || 1) - 1;
      }
    }
  });


  return assignments;
};
