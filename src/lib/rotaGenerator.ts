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

const isTransitionAllowed = (fromShift: Shift | undefined, toShift: Shift): boolean => {
    if (!fromShift) return true; // No previous shift, any transition is fine
    if (fromShift.isExtreme && toShift.isExtreme) return false;
    return true;
};

const getNextShift = (currentShiftId: string, shifts: Shift[]): Shift => {
    const sortedShifts = [...shifts].sort((a, b) => a.sequence - b.sequence);
    const currentShift = sortedShifts.find(s => s.id === currentShiftId);
    const currentIndex = currentShift ? sortedShifts.indexOf(currentShift) : -1;
    const nextIndex = (currentIndex + 1) % sortedShifts.length;
    return sortedShifts[nextIndex];
}

export const generateNewRotaAssignments = (
  teamMembers: TeamMember[],
  allShifts: Shift[],
  shiftStreaks: ShiftStreak
): RotaAssignments => {
  const assignments: RotaAssignments = {};
  const shiftMap = new Map(allShifts.map(s => [s.id, s]));
  const sortedShifts = [...allShifts].sort((a, b) => a.sequence - b.sequence);

  let availableMembers = teamMembers.filter(m => !m.fixedShiftId);
  const assignedCounts: Record<string, number> = {};
  allShifts.forEach(s => assignedCounts[s.id] = 0);

  // 1. Assign fixed shifts
  teamMembers.filter(m => m.fixedShiftId).forEach(member => {
    assignments[member.id] = member.fixedShiftId!;
    assignedCounts[member.fixedShiftId!]++;
  });

  // 2. Force rotation for members who have reached their streak limit (max 2)
  const membersToRotate = availableMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    return streak && streak.count >= 2;
  });

  membersToRotate.forEach(member => {
    const lastShiftId = shiftStreaks[member.id].shiftId!;
    let nextShift = getNextShift(lastShiftId, allShifts);
    
    // Ensure transition is allowed
    let attempts = 0;
    while (!isTransitionAllowed(shiftMap.get(lastShiftId), nextShift) && attempts < sortedShifts.length) {
        nextShift = getNextShift(nextShift.id, allShifts);
        attempts++;
    }

    // Try to assign to a shift that needs people
    let assigned = false;
    for (let i = 0; i < sortedShifts.length; i++) {
        const potentialShift = getNextShift(nextShift.id, sortedShifts);
        if (isTransitionAllowed(shiftMap.get(lastShiftId), potentialShift) && assignedCounts[potentialShift.id] < potentialShift.maxTeam) {
            assignments[member.id] = potentialShift.id;
            assignedCounts[potentialShift.id]++;
            assigned = true;
            break;
        }
    }
    
    // Fallback if no ideal spot found
    if (!assigned) {
        assignments[member.id] = nextShift.id;
        assignedCounts[nextShift.id]++;
    }
  });
  
  availableMembers = availableMembers.filter(m => !assignments[m.id]);

  // 3. Try to continue streaks for those not forced to rotate
  const membersToContinue = availableMembers.filter(m => {
    const streak = shiftStreaks[m.id];
    return streak && streak.shiftId && assignedCounts[streak.shiftId] < shiftMap.get(streak.shiftId)!.maxTeam;
  });

  membersToContinue.forEach(member => {
    const currentShiftId = shiftStreaks[member.id].shiftId!;
    assignments[member.id] = currentShiftId;
    assignedCounts[currentShiftId]++;
  });

  availableMembers = availableMembers.filter(m => !assignments[m.id]);
  
  shuffle(availableMembers);

  // 4. Fill remaining shifts respecting min/max and rules
  sortedShifts.forEach(shift => {
    while (assignedCounts[shift.id] < shift.minTeam) {
        const memberToAssign = availableMembers.find(m => 
            isTransitionAllowed(shiftMap.get(m.lastShiftId || ''), shift)
        );

        if (memberToAssign) {
            assignments[memberToAssign.id] = shift.id;
            assignedCounts[shift.id]++;
            availableMembers = availableMembers.filter(m => m.id !== memberToAssign.id);
        } else {
            break; // No suitable members left for this shift
        }
    }
  });

  // 5. Assign any remaining members to shifts that are not full
  availableMembers.forEach(member => {
    const lastShift = shiftMap.get(member.lastShiftId || '');
    let assigned = false;
    // Try to assign sequentially
    for (const shift of sortedShifts) {
        if (assignedCounts[shift.id] < shift.maxTeam && isTransitionAllowed(lastShift, shift)) {
            assignments[member.id] = shift.id;
            assignedCounts[shift.id]++;
            assigned = true;
            break;
        }
    }
    // Fallback: assign to the first available non-full shift, ignoring transition rules if necessary
    if (!assigned) {
        for (const shift of sortedShifts) {
            if (assignedCounts[shift.id] < shift.maxTeam) {
                assignments[member.id] = shift.id;
                assignedCounts[shift.id]++;
                break;
            }
        }
    }
  });

  // Final check to ensure all members are assigned
  teamMembers.forEach(member => {
    if (!assignments[member.id]) {
      const fallbackShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam) || sortedShifts[0];
      if (fallbackShift) {
        assignments[member.id] = fallbackShift.id;
        assignedCounts[fallbackShift.id]++;
      } else {
        // This should not happen if maxTeam is configured properly
        assignments[member.id] = "Not Assigned";
      }
    }
  });

  return assignments;
};
