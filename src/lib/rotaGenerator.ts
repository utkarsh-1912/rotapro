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
  let availableMembers = teamMembers.filter(m => !m.fixedShiftId);
  
  // 1. Assign fixed shifts
  teamMembers.filter(m => m.fixedShiftId).forEach(member => {
    assignments[member.id] = member.fixedShiftId!;
  });

  // 2. Force rotation for members who have reached their streak limit
  const membersToRotate = availableMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    if (!streak || !streak.shiftId) return false;
    
    // US/APAC rule: rotate after 1 period
    if ((streak.shiftId === 'apac' || streak.shiftId === 'us') && streak.count >= 1) {
      return true;
    }
    // Other shifts rule: rotate after 2 periods
    if (streak.count >= 2) {
      return true;
    }
    return false;
  });

  membersToRotate.forEach(member => {
    const lastShiftId = shiftStreaks[member.id].shiftId;
    const nextShiftId = getNextShiftId(lastShiftId);
    assignments[member.id] = nextShiftId;
  });

  availableMembers = availableMembers.filter(m => !assignments[m.id]);

  // 3. Try to continue streaks for those not forced to rotate
  const membersToContinue = availableMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    return streak && streak.shiftId && streak.count > 0;
  });

  membersToContinue.forEach(member => {
      const currentShiftId = shiftStreaks[member.id].shiftId!;
      assignments[member.id] = currentShiftId;
  });

  availableMembers = availableMembers.filter(m => !assignments[m.id]);

  // 4. Fill remaining required shifts from the rest of the pool
  const unassignedShifts: string[] = [];
  const assignedCounts = Object.values(assignments).reduce((acc, shiftId) => {
      if(shiftId) acc[shiftId] = (acc[shiftId] || 0) + 1;
      return acc;
  }, {} as Record<string, number>);

  if ((assignedCounts['apac'] || 0) < 1) unassignedShifts.push('apac');
  if ((assignedCounts['us'] || 0) < 1) unassignedShifts.push('us');
  if ((assignedCounts['emea'] || 0) < 1) unassignedShifts.push('emea');
  
  shuffle(availableMembers);

  unassignedShifts.forEach(shiftId => {
      if (availableMembers.length > 0) {
          const member = availableMembers.pop()!;
          assignments[member.id] = shiftId;
      }
  });
  
  availableMembers = availableMembers.filter(m => !assignments[m.id]);

  // 5. Assign all remaining to LATE EMEA
  availableMembers.forEach(member => {
      assignments[member.id] = 'late_emea';
  });

  // 6. Final check: If minimums are still not met (e.g. fixed shifts create conflict), pull from LATE EMEA
  ['apac', 'us', 'emea'].forEach(shiftId => {
    const currentCount = Object.values(assignments).filter(s => s === shiftId).length;
    if (currentCount < 1) {
      // Find a member on LATE EMEA to move
      const memberToMoveId = Object.keys(assignments).find(id => assignments[id] === 'late_emea' && !teamMembers.find(m => m.id === id)?.fixedShiftId);
      if (memberToMoveId) {
        assignments[memberToMoveId] = shiftId;
      }
    }
  });

  return assignments;
};
