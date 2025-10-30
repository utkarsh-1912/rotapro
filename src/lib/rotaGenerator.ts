
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

const getNextShift = (currentShiftId: string, sortedShifts: Shift[]): Shift => {
    const currentIndex = sortedShifts.findIndex(s => s.id === currentShiftId);
    // If current shift is not found or is the last one, loop back to the first shift
    if (currentIndex === -1 || currentIndex === sortedShifts.length - 1) {
        return sortedShifts[0];
    }
    return sortedShifts[currentIndex + 1];
}

export const generateNewRotaAssignments = (
  teamMembers: TeamMember[],
  allShifts: Shift[],
  shiftStreaks: ShiftStreak
): RotaAssignments => {
  const assignments: RotaAssignments = {};
  const shiftMap = new Map(allShifts.map(s => [s.id, s]));
  const sortedShifts = [...allShifts].sort((a, b) => a.sequence - b.sequence);

  let unassignedMembers = [...teamMembers];
  const assignedCounts: Record<string, number> = {};
  allShifts.forEach(s => assignedCounts[s.id] = 0);

  // 1. Assign fixed shifts first and remove them from the pool
  const fixedMembers = unassignedMembers.filter(m => m.fixedShiftId);
  fixedMembers.forEach(member => {
    const shiftId = member.fixedShiftId!;
    if (shiftMap.has(shiftId)) {
        assignments[member.id] = shiftId;
        assignedCounts[shiftId]++;
    }
  });
  unassignedMembers = unassignedMembers.filter(m => !m.fixedShiftId);
  
  // 2. Identify members who MUST rotate and assign them a new valid shift
  const membersToForceRotate = unassignedMembers.filter(member => {
    const streak = shiftStreaks[member.id];
    if (!streak || !streak.shiftId) return false;
    const lastShift = shiftMap.get(streak.shiftId);
    if (!lastShift) return false;

    // Force rotation if on an extreme shift for 1 period, or any shift for 2.
    return (lastShift.isExtreme && streak.count >= 1) || streak.count >= 2;
  });

  // Sort them to process consistently
  membersToForceRotate.sort((a, b) => a.name.localeCompare(b.name));

  membersToForceRotate.forEach(member => {
      const lastShiftId = shiftStreaks[member.id].shiftId!;
      const lastShift = shiftMap.get(lastShiftId)!;
      
      let nextShift = getNextShift(lastShiftId, sortedShifts);
      let attempts = 0;

      // Find a valid next shift that has space and is an allowed transition
      while (attempts < sortedShifts.length) {
          if (isTransitionAllowed(lastShift, nextShift) && assignedCounts[nextShift.id] < nextShift.maxTeam) {
              break; // Found a valid shift
          }
          nextShift = getNextShift(nextShift.id, sortedShifts);
          attempts++;
      }
      
      // If after all attempts we still loop back to an invalid one, we might need a fallback.
      // For now, assign the best-found option.
      assignments[member.id] = nextShift.id;
      assignedCounts[nextShift.id]++;
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 3. Try to continue streaks for members who are not forced to rotate
  const membersToContinueStreak = unassignedMembers.filter(member => {
      const streak = shiftStreaks[member.id];
      return streak && streak.shiftId && (shiftMap.get(streak.shiftId)?.isExtreme === false && streak.count < 2);
  });

  membersToContinueStreak.forEach(member => {
      const lastShiftId = shiftStreaks[member.id].shiftId!;
      const lastShift = shiftMap.get(lastShiftId)!;
      if (assignedCounts[lastShiftId] < lastShift.maxTeam) {
          assignments[member.id] = lastShiftId;
          assignedCounts[lastShiftId]++;
      }
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 4. Fill remaining minimums for shifts
  shuffle(unassignedMembers);
  for (const shift of sortedShifts) {
    while (assignedCounts[shift.id] < shift.minTeam) {
      let assigned = false;
      for (let i = 0; i < unassignedMembers.length; i++) {
        const member = unassignedMembers[i];
        const lastShiftId = shiftStreaks[member.id]?.shiftId;
        const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
        if (isTransitionAllowed(lastShift, shift)) {
          assignments[member.id] = shift.id;
          assignedCounts[shift.id]++;
          unassignedMembers.splice(i, 1);
          assigned = true;
          break; // Exit member loop and re-check while condition
        }
      }
      if (!assigned) {
        break; // No suitable members left for this shift's min requirement
      }
    }
  }

  // 5. Assign any remaining unassigned members to any shift with capacity
  shuffle(unassignedMembers).forEach(member => {
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
    let assigned = false;
    for (const shift of sortedShifts) {
        if (assignedCounts[shift.id] < shift.maxTeam && isTransitionAllowed(lastShift, shift)) {
            assignments[member.id] = shift.id;
            assignedCounts[shift.id]++;
            assigned = true;
            break;
        }
    }
    // Fallback: If no transition is allowed, find first available spot (less ideal)
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

  // 6. Final guarantee: Ensure no member is left unassigned
  teamMembers.forEach(member => {
    if (!assignments[member.id] && !member.fixedShiftId) {
      const fallbackShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam) || sortedShifts[0];
      if (fallbackShift) {
        assignments[member.id] = fallbackShift.id;
        assignedCounts[fallbackShift.id]++;
      } else {
        assignments[member.id] = "Not Assigned"; // Should be very rare
      }
    }
  });

  return assignments;
};


export const balanceAssignments = (
    assignments: RotaAssignments,
    shifts: Shift[],
    teamMembers: TeamMember[],
    shiftStreaks: ShiftStreak
): RotaAssignments => {
    const shiftMap = new Map(shifts.map(s => [s.id, s]));
    const memberMap = new Map(teamMembers.map(m => [m.id, m]));
    const balancedAssignments = { ...assignments };

    const calculateCounts = () => {
        const counts: Record<string, string[]> = {};
        shifts.forEach(s => counts[s.id] = []);
        for (const memberId in balancedAssignments) {
            const member = memberMap.get(memberId);
            // Only count non-fixed members for balancing purposes
            if(member && !member.fixedShiftId) {
                const shiftId = balancedAssignments[memberId];
                if (shiftId && counts[shiftId]) {
                    counts[shiftId].push(memberId);
                }
            }
        }
        return counts;
    };

    let shiftCounts = calculateCounts();
    let loops = 0; // Failsafe

    while (loops < 10) {
        const understaffedShifts = shifts.filter(s => (shiftCounts[s.id]?.length ?? 0) < s.minTeam);
        const overstaffedShifts = shifts.filter(s => (shiftCounts[s.id]?.length ?? 0) > s.minTeam);

        if (understaffedShifts.length === 0) {
            break; // All minimums met
        }

        const targetShift = understaffedShifts[0];
        let moved = false;

        // Try to find a direct move from an overstaffed shift
        for (const sourceShift of overstaffedShifts) {
            const potentialMovers = shiftCounts[sourceShift.id].filter(memberId => {
                const lastShiftId = shiftStreaks[memberId]?.shiftId;
                const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
                return isTransitionAllowed(lastShift, targetShift);
            });

            if (potentialMovers.length > 0) {
                const moverId = potentialMovers[0];
                balancedAssignments[moverId] = targetShift.id;
                moved = true;
                break; // Mover found, break from sourceShift loop
            }
        }

        // If no direct move, try a swap
        if (!moved) {
            for (const sourceShift of overstaffedShifts) {
                const swapperFromOverstaffed = shiftCounts[sourceShift.id][0]; // Just take the first one
                
                // Find someone in the target shift who CAN move to the source shift
                const swapperFromUnderstaffed = (shiftCounts[targetShift.id] || []).find(memberId => {
                    const lastShiftId = shiftStreaks[memberId]?.shiftId;
                    const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
                    return isTransitionAllowed(lastShift, sourceShift);
                });

                if (swapperFromOverstaffed && swapperFromUnderstaffed) {
                    // Perform the swap
                    balancedAssignments[swapperFromOverstaffed] = targetShift.id;
                    balancedAssignments[swapperFromUnderstaffed] = sourceShift.id;
                    moved = true;
                    break;
                }
            }
        }
        
        if (!moved) {
            // As a last resort, just move someone, ignoring transition rules
            for (const sourceShift of overstaffedShifts) {
                const moverId = shiftCounts[sourceShift.id][0];
                balancedAssignments[moverId] = targetShift.id;
                moved = true;
                break;
            }
        }

        if (!moved) {
            // This should be rare, means no one can be moved.
            console.warn("Could not balance shifts. Check constraints.");
            break;
        }

        shiftCounts = calculateCounts();
        loops++;
    }

    return balancedAssignments;
};
