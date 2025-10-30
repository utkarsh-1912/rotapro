
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
      if (assignments[member.id]) return; // Already assigned (e.g. fixed)

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
      
      assignments[member.id] = nextShift.id;
      assignedCounts[nextShift.id]++;
  });
  unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);

  // 3. Try to continue streaks for members who are not forced to rotate
  const membersToContinueStreak = unassignedMembers.filter(member => {
      const streak = shiftStreaks[member.id];
      if (!streak || !streak.shiftId) return false;
      const lastShift = shiftMap.get(streak.shiftId);
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

  // 4. Fill remaining minimums for shifts
  shuffle(unassignedMembers);
  for (const shift of sortedShifts) {
    while (assignedCounts[shift.id] < shift.minTeam) {
      let assigned = false;
      for (let i = 0; i < unassignedMembers.length; i++) {
        const member = unassignedMembers[i];
        if (assignments[member.id]) continue;

        const lastShiftId = shiftStreaks[member.id]?.shiftId;
        const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
        if (isTransitionAllowed(lastShift, shift)) {
          assignments[member.id] = shift.id;
          assignedCounts[shift.id]++;
          assigned = true;
          break; // Exit member loop and re-check while condition
        }
      }
      if (!assigned) {
        break; // No suitable members left for this shift's min requirement
      }
    }
     unassignedMembers = unassignedMembers.filter(m => !assignments[m.id]);
  }

  // 5. Assign any remaining unassigned members to any shift with capacity
  shuffle(unassignedMembers).forEach(member => {
    if (assignments[member.id]) return;
    const lastShiftId = shiftStreaks[member.id]?.shiftId;
    const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
    
    // Find the next logical shift first
    let nextBestShift: Shift | undefined = undefined;
    if(lastShift) {
        let candidate = getNextShift(lastShift.id, sortedShifts);
        for(let i=0; i < sortedShifts.length; i++) {
             if (assignedCounts[candidate.id] < candidate.maxTeam && isTransitionAllowed(lastShift, candidate)) {
                nextBestShift = candidate;
                break;
            }
            candidate = getNextShift(candidate.id, sortedShifts);
        }
    }

    if (nextBestShift) {
        assignments[member.id] = nextBestShift.id;
        assignedCounts[nextBestShift.id]++;
        return;
    }
    
    // Fallback: if no logical next shift is available, find any with capacity
    const fallbackShift = sortedShifts.find(s => assignedCounts[s.id] < s.maxTeam);
    if(fallbackShift) {
        assignments[member.id] = fallbackShift.id;
        assignedCounts[fallbackShift.id]++;
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
    let loops = 0; // Failsafe

    while (loops < 20) {
        const understaffedShifts = sortedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) < s.minTeam);
        const overstaffedShifts = sortedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) > s.maxTeam);
        const appropriatelyStaffed = sortedShifts.filter(s => (shiftCounts[s.id]?.length ?? 0) >= s.minTeam && (shiftCounts[s.id]?.length ?? 0) <= s.maxTeam);
        
        if (understaffedShifts.length === 0) {
            break; // All minimums met
        }
        
        const targetShift = understaffedShifts[0];
        let moved = false;

        // 1. Try to find a donor from an overstaffed shift.
        const potentialDonors = overstaffedShifts
          .flatMap(s => shiftCounts[s.id])
          .filter(memberId => {
              const lastShiftId = shiftStreaks[memberId]?.shiftId;
              const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
              return isTransitionAllowed(lastShift, targetShift);
          });
        
        if(potentialDonors.length > 0) {
            const donorId = potentialDonors[0];
            balancedAssignments[donorId] = targetShift.id;
            moved = true;
        }


        // 2. If no donor, try to find a donor from an appropriately staffed shift that can afford to lose one.
        if (!moved) {
            const donorShifts = appropriatelyStaffed.filter(s => (shiftCounts[s.id]?.length ?? 0) > s.minTeam);
            const potentialDonorsFromNormal = donorShifts
              .flatMap(s => shiftCounts[s.id])
              .filter(memberId => {
                  const lastShiftId = shiftStreaks[memberId]?.shiftId;
                  const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
                  return isTransitionAllowed(lastShift, targetShift);
              });
            
             if(potentialDonorsFromNormal.length > 0) {
                const donorId = potentialDonorsFromNormal[0];
                balancedAssignments[donorId] = targetShift.id;
                moved = true;
            }
        }

        // 3. If still no move, try a swap with an overstaffed shift.
        if (!moved) {
            for (const sourceShift of overstaffedShifts) {
                const swapperFromOverstaffed = (shiftCounts[sourceShift.id] || []).find(memberId => {
                     const lastShiftId = shiftStreaks[memberId]?.shiftId;
                     const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
                     return isTransitionAllowed(lastShift, targetShift);
                });

                if (swapperFromOverstaffed) {
                    const swapperFromUnderstaffed = (shiftCounts[targetShift.id] || []).find(memberId => {
                        const lastShiftId = shiftStreaks[memberId]?.shiftId;
                        const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
                        return isTransitionAllowed(lastShift, sourceShift);
                    });

                    if (swapperFromUnderstaffed) {
                        balancedAssignments[swapperFromOverstaffed] = targetShift.id;
                        balancedAssignments[swapperFromUnderstaffed] = sourceShift.id;
                        moved = true;
                        break;
                    }
                }
            }
        }
        
        if (!moved) {
            // Failsafe: just move someone from the most overstaffed shift.
            const mostOverstaffed = overstaffedShifts.sort((a,b) => (shiftCounts[b.id]?.length ?? 0) - (shiftCounts[a.id]?.length ?? 0))[0];
            if(mostOverstaffed) {
                const memberToMove = shiftCounts[mostOverstaffed.id][0];
                balancedAssignments[memberToMove] = targetShift.id;
                moved = true;
            }
        }

        if (!moved) {
            console.warn("Could not balance shifts. Check constraints.", { understaffedShifts, overstaffedShifts });
            break;
        }

        shiftCounts = calculateCounts();
        loops++;
    }

    if (loops >= 20) {
        console.warn("BalanceAssignments reached max iterations.");
    }

    return balancedAssignments;
};
