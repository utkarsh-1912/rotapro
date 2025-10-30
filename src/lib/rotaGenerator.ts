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
  let unassignedMembers = teamMembers.filter(m => !m.fixedShiftId);

  // 1. Handle fixed shift members
  teamMembers.filter(m => m.fixedShiftId).forEach(member => {
    assignments[member.id] = member.fixedShiftId!;
  });

  // 2. Members who MUST rotate (APAC/US for >1 period, others for >2)
  const mustRotateMembers = unassignedMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    if (!streak || !streak.shiftId) return false;
    if ((streak.shiftId === 'apac' || streak.shiftId === 'us') && streak.count >= 1) return true;
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
      return streak && streak.shiftId && streak.count < 2 && !(streak.shiftId === 'apac' || streak.shiftId === 'us');
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
      // Find someone who wasn't just on that shift
      let memberToAssign = unassignedMembers.find(m => shiftStreaks[m.id]?.shiftId !== shiftId);
      if (!memberToAssign) memberToAssign = unassignedMembers[0]; // fallback if all were on it

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

  // 6. Assign all remaining members to LATE EMEA
  shuffle(unassignedMembers).forEach(member => {
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    let nextShiftId = getNextShiftId(lastShiftId);

    // If their natural next shift is already filled by a required role, default them to LATE EMEA
    const isNextShiftRequiredAndFilled = (nextShiftId === 'apac' || nextShiftId === 'us') && Object.values(assignments).includes(nextShiftId);
    
    if (isNextShiftRequiredAndFilled) {
        assignments[member.id] = 'late_emea';
    } else {
        assignments[member.id] = nextShiftId;
    }
  });
  
  // Final balancing pass to ensure minimums
  const finalCounts = Object.values(assignments).reduce((acc, shiftId) => {
    if(shiftId) acc[shiftId] = (acc[shiftId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  ['apac', 'us', 'emea'].forEach(shiftId => {
    if ((finalCounts[shiftId] || 0) < 1) {
      const lateEmeaMembers = teamMembers.filter(m => assignments[m.id] === 'late_emea' && !m.fixedShiftId);
      if (lateEmeaMembers.length > 0) {
        const memberToMove = lateEmeaMembers[0];
        assignments[memberToMove.id] = shiftId;
      }
    }
  });


  return assignments;
};
