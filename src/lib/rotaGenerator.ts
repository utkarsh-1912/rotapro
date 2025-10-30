
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

const getNextShift = (currentShiftId: string | undefined, sortedShifts: Shift[]): Shift => {
    if (sortedShifts.length === 0) {
        throw new Error("Cannot get next shift from an empty array.");
    }
    
    // If there's no current shift, start with the first one in the sequence.
    if (!currentShiftId) {
        return sortedShifts[0];
    }

    const currentShift = sortedShifts.find(s => s.id === currentShiftId);
    
    // If the current shift isn't found (e.g., it was deleted), start from the beginning.
    if (!currentShift) {
        return sortedShifts[0];
    }
    
    const currentSequence = currentShift.sequence;
    
    // Find the shift with the very next sequence number.
    let nextShift = sortedShifts.find(s => s.sequence > currentSequence);
    
    // If no shift has a greater sequence, loop back to the first shift in the sequence.
    if (!nextShift) {
        nextShift = sortedShifts[0];
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

  let flexibleMembers = shuffle(teamMembers.filter(m => !m.fixedShiftId));
  const assignedCounts: Record<string, number> = {};
  allShifts.forEach(s => assignedCounts[s.id] = 0);

  // 1. Assign fixed shifts first and remove them from the pool
  teamMembers.forEach(member => {
    if (member.fixedShiftId) {
        const shiftId = member.fixedShiftId;
        if (shiftMap.has(shiftId)) {
            assignments[member.id] = shiftId;
            assignedCounts[shiftId]++;
        }
    }
  });
  
  // 2. Identify members who MUST rotate vs. who CAN continue
  const mustRotate: TeamMember[] = [];
  const canContinue: TeamMember[] = [];

  flexibleMembers.forEach(member => {
    const streak = shiftStreaks[member.id];
    if (!streak || !streak.shiftId) {
        // No previous shift, they can go anywhere. Treat as "must rotate" to get them into the system.
        mustRotate.push(member);
        return;
    }
    const lastShift = shiftMap.get(streak.shiftId);
    if (!lastShift) {
        // Last shift was deleted, must rotate.
        mustRotate.push(member);
        return;
    }
    // Force rotation if on an extreme shift or non-extreme for 2 periods.
    if ((lastShift.isExtreme && streak.count >= 1) || (!lastShift.isExtreme && streak.count >= 2)) {
        mustRotate.push(member);
    } else {
        canContinue.push(member);
    }
  });

  // 3. Assign members who must rotate to their strict next shift
  mustRotate.forEach(member => {
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
    const nextShift = getNextShift(lastShiftId, sortedShifts);

    // Only one valid destination: the strict next shift.
    if (isTransitionAllowed(lastShift, nextShift) && assignedCounts[nextShift.id] < nextShift.maxTeam) {
        assignments[member.id] = nextShift.id;
        assignedCounts[nextShift.id]++;
    }
  });
  flexibleMembers = flexibleMembers.filter(m => !assignments[m.id]);

  // 4. Assign members who can continue their streak, if there's space
  canContinue.forEach(member => {
      const lastShiftId = shiftStreaks[member.id].shiftId!;
      const lastShift = shiftMap.get(lastShiftId)!;
      if (assignedCounts[lastShiftId] < lastShift.maxTeam) {
          assignments[member.id] = lastShiftId;
          assignedCounts[lastShiftId]++;
      }
  });
  flexibleMembers = flexibleMembers.filter(m => !assignments[m.id]);

  // 5. Fill remaining minimums for shifts with any remaining unassigned members
  for (const shift of sortedShifts) {
    while (assignedCounts[shift.id] < shift.minTeam) {
        const memberToAssign = flexibleMembers.find(member => {
            if (assignments[member.id]) return false;
            // When filling minimums, we can be more flexible. Find any allowed transition.
            const lastShiftId = shiftStreaks[member.id]?.shiftId;
            const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
            return isTransitionAllowed(lastShift, shift);
        });

        if (memberToAssign) {
            assignments[memberToAssign.id] = shift.id;
            assignedCounts[shift.id]++;
            flexibleMembers = flexibleMembers.filter(m => m.id !== memberToAssign.id);
        } else {
            break; // No suitable members left for this shift's min requirement
        }
    }
  }

  // 6. Assign any truly leftover members, respecting strict +1 sequence where possible
  flexibleMembers.forEach(member => {
    if (assignments[member.id]) return;

    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
    const nextShift = getNextShift(lastShiftId, sortedShifts);
    
    // Try to place in the strict next shift
    if (isTransitionAllowed(lastShift, nextShift) && assignedCounts[nextShift.id] < nextShift.maxTeam) {
        assignments[member.id] = nextShift.id;
        assignedCounts[nextShift.id]++;
        return;
    }
    
    // Fallback: if strict next is not possible, find ANY available forward-sequence shift
    let currentAttempt = getNextShift(nextShift.id, sortedShifts);
    for(let i=0; i < sortedShifts.length - 1; i++) {
         if (isTransitionAllowed(lastShift, currentAttempt) && assignedCounts[currentAttempt.id] < currentAttempt.maxTeam) {
            assignments[member.id] = currentAttempt.id;
            assignedCounts[currentAttempt.id]++;
            return;
        }
        currentAttempt = getNextShift(currentAttempt.id, sortedShifts);
    }

    // Final fallback: any shift with capacity
    const anyAvailableShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam);
    if(anyAvailableShift) {
        assignments[member.id] = anyAvailableShift.id;
        assignedCounts[anyAvailableShift.id]++;
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
        
        if (understaffedShifts.length === 0) {
            break; // All minimums are met, balancing is successful
        }
        
        const targetShift = understaffedShifts[0]; // Focus on fixing the first understaffed shift
        let moved = false;

        const overstaffedShifts = sortedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) > s.maxTeam);
        const appropriatelyStaffedShifts = sortedShifts.filter(s => 
            (shiftCounts[s.id]?.length ?? 0) > s.minTeam && (shiftCounts[s.id]?.length ?? 0) <= s.maxTeam
        );

        // 1. Try to pull a valid member from an overstaffed shift or an appropriately staffed shift that can spare one.
        const potentialDonors = [
            ...overstaffedShifts.flatMap(s => shiftCounts[s.id] || []),
            ...appropriatelyStaffedShifts.flatMap(s => shiftCounts[s.id] || [])
        ];
        
        for (const donorId of potentialDonors) {
             const lastShiftId = shiftStreaks[donorId]?.shiftId;
             const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
             const currentShiftId = balancedAssignments[donorId];
             const currentShift = currentShiftId ? shiftMap.get(currentShiftId) : undefined;

             if (!currentShift) continue;

             // Ensure the original shift doesn't become understaffed
             if ((shiftCounts[currentShift.id]?.length ?? 0) <= currentShift.minTeam) {
                 continue;
             }
             
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

        // 2. If no simple move is possible, try to SWAP a member from the understaffed shift with one from another shift.
        for (const sourceShift of [...overstaffedShifts, ...appropriatelyStaffedShifts]) {
            if (moved) break;
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
