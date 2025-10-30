
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
    const currentShift = sortedShifts.find(s => s.id === currentShiftId);
    
    if (!currentShift) {
        // If the current shift isn't found (e.g., it was deleted), start from the beginning.
        return sortedShifts[0];
    }
    
    const currentSequence = currentShift.sequence;
    
    // Find the shift with the next sequence number.
    let nextShift = sortedShifts.find(s => s.sequence > currentSequence);
    
    // If no shift has a greater sequence, loop back to the first sequence.
    if (!nextShift) {
        nextShift = sortedShifts[0]; // Assumes sortedShifts is sorted by sequence, so the first element is sequence 1.
    }
    
    return nextShift;
}


export const generateNewRotaAssignments = (
  teamMembers: TeamMember[],
  allShifts: Shift[],
  shiftStreaks: ShiftStreak
): RotaAssignments => {
  const assignments: RotaAssignments = {};
  const shiftMap = new Map(allShifts.map(s => [s.id, s]));
  const sortedShifts = [...allShifts].sort((a, b) => a.sequence - b.sequence);
  if (sortedShifts.length === 0) return {};

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

    // Force rotation if on an extreme shift for 1 period, or any non-extreme shift for 2.
    return (lastShift.isExtreme && streak.count >= 1) || (!lastShift.isExtreme && streak.count >= 2);
  });

  // Sort them to process consistently
  membersToForceRotate.sort((a, b) => a.name.localeCompare(b.name));

  membersToForceRotate.forEach(member => {
      if (assignments[member.id]) return; // Already assigned (should not happen for flexible members)

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
      
      // If a valid shift was found, assign it. Otherwise, they remain unassigned for now.
      if (attempts < sortedShifts.length) {
        assignments[member.id] = nextShift.id;
        assignedCounts[nextShift.id]++;
      }
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 3. Try to continue streaks for members who are not forced to rotate
  const membersToContinueStreak = unassignedMembers.filter(member => {
      const streak = shiftStreaks[member.id];
      if (!streak || !streak.shiftId) return false;
      const lastShift = shiftMap.get(streak.shiftId);
      // Only continue non-extreme shifts, and only if they haven't hit the limit of 2
      return lastShift && !lastShift.isExtreme && streak.count < 2;
  });

  membersToContinueStreak.forEach(member => {
      if (assignments[member.id]) return;
      const lastShiftId = shiftStreaks[member.id].shiftId!;
      const lastShift = shiftMap.get(lastShiftId)!;
      if (assignedCounts[lastShiftId] < lastShift.maxTeam) {
          assignments[member.id] = lastShiftId;
          assignedCounts[lastShiftId]++;
      }
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 4. Fill remaining minimums for shifts with any remaining unassigned members
  shuffle(unassignedMembers);
  for (const shift of sortedShifts) {
    while (assignedCounts[shift.id] < shift.minTeam) {
        const memberToAssign = unassignedMembers.find(member => {
            if (assignments[member.id]) return false;
            const lastShiftId = shiftStreaks[member.id]?.shiftId;
            const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
            return isTransitionAllowed(lastShift, shift);
        });

        if (memberToAssign) {
            assignments[memberToAssign.id] = shift.id;
            assignedCounts[shift.id]++;
            unassignedMembers = unassignedMembers.filter(m => m.id !== memberToAssign.id);
        } else {
            break; // No suitable members left for this shift's min requirement
        }
    }
  }

  // 5. Assign any remaining unassigned members to any shift with capacity, preferring forward sequence moves
  shuffle(unassignedMembers).forEach(member => {
    if (assignments[member.id]) return;
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
    
    // Find best possible shift: forward in sequence, with capacity, and allowed transition
    let bestShift: Shift | undefined = undefined;
    if(lastShift) {
        let candidate = getNextShift(lastShift.id, sortedShifts);
        for(let i=0; i < sortedShifts.length; i++) {
             if (assignedCounts[candidate.id] < candidate.maxTeam && isTransitionAllowed(lastShift, candidate)) {
                bestShift = candidate;
                break;
            }
            candidate = getNextShift(candidate.id, sortedShifts);
        }
    } else { // No last shift, find first available
        bestShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam);
    }
    
    // Fallback: if no ideal forward shift, find ANY shift with capacity
    if (!bestShift) {
        bestShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam);
    }

    if (bestShift) {
        assignments[member.id] = bestShift.id;
        assignedCounts[bestShift.id]++;
    } else {
        // This case should be rare, means all shifts are at max capacity
        assignments[member.id] = "Not Assigned";
    }
  });

  // Final check to ensure no flexible member is left unassigned
  teamMembers.forEach(member => {
    if (!member.fixedShiftId && !assignments[member.id]) {
      const fallbackShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam) || sortedShifts[0];
      if (fallbackShift) {
        assignments[member.id] = fallbackShift.id;
        assignedCounts[fallbackShift.id]++;
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
    const sortedShifts = [...shifts].sort((a, b) => a.sequence - b.sequence);

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
    let loops = 0; // Failsafe to prevent infinite loops

    // Loop until all minimums are met or we can't make any more moves
    while (loops < 20) {
        const understaffedShifts = sortedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) < s.minTeam);
        const overstaffedShifts = sortedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) > s.maxTeam);
        const appropriatelyStaffedShifts = sortedShifts.filter(s => 
            (shiftCounts[s.id]?.length ?? 0) >= s.minTeam && (shiftCounts[s.id]?.length ?? 0) <= s.maxTeam
        );
        
        if (understaffedShifts.length === 0) {
            break; // All minimums are met, balancing is successful
        }
        
        const targetShift = understaffedShifts[0]; // Focus on fixing the first understaffed shift
        let moved = false;

        // 1. Try to pull a valid member from an overstaffed shift.
        const potentialDonors = overstaffedShifts.flatMap(s => shiftCounts[s.id]);
        for (const donorId of potentialDonors) {
             const lastShiftId = shiftStreaks[donorId]?.shiftId;
             const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
             if (isTransitionAllowed(lastShift, targetShift)) {
                 balancedAssignments[donorId] = targetShift.id;
                 moved = true;
                 break;
             }
        }
        if (moved) {
            shiftCounts = calculateCounts();
            loops++;
            continue;
        }

        // 2. If no simple move is possible, try pulling from an appropriately staffed shift that can spare a member.
        const spareableShifts = appropriatelyStaffedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) > s.minTeam);
        const potentialSpareDonors = spareableShifts.flatMap(s => shiftCounts[s.id]);
        for (const donorId of potentialSpareDonors) {
             const lastShiftId = shiftStreaks[donorId]?.shiftId;
             const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
             if (isTransitionAllowed(lastShift, targetShift)) {
                 balancedAssignments[donorId] = targetShift.id;
                 moved = true;
                 break;
             }
        }
        if (moved) {
            shiftCounts = calculateCounts();
            loops++;
            continue;
        }

        // 3. If still nothing, try to SWAP a member from the understaffed shift with one from an overstaffed shift.
        for (const sourceShift of overstaffedShifts) {
            const memberToMoveToTarget = (shiftCounts[sourceShift.id] || []).find(memberId => {
                 const lastShift = shiftStreaks[memberId]?.shiftId ? shiftMap.get(shiftStreaks[memberId].shiftId!) : undefined;
                 return isTransitionAllowed(lastShift, targetShift);
            });

            if (memberToMoveToTarget) {
                const memberToMoveToSource = (shiftCounts[targetShift.id] || []).find(memberId => {
                    const lastShift = shiftStreaks[memberId]?.shiftId ? shiftMap.get(shiftStreaks[memberId].shiftId!) : undefined;
                    return isTransitionAllowed(lastShift, sourceShift);
                });

                if (memberToMoveToSource) {
                    balancedAssignments[memberToMoveToTarget] = targetShift.id;
                    balancedAssignments[memberToMoveToSource] = sourceShift.id;
                    moved = true;
                    break;
                }
            }
        }
        if (moved) {
            shiftCounts = calculateCounts();
            loops++;
            continue;
        }
        
        // If we get here, no valid moves or swaps could be found. Break to avoid infinite loop.
        console.warn("Could not fully balance shifts. Check constraints vs. team size.", { understaffedShifts });
        break;
    }

    if (loops >= 20) {
        console.warn("BalanceAssignments reached max iterations.");
    }

    return balancedAssignments;
};
