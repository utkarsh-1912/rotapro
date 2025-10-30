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

export const generateNewRotaAssignments = (
  teamMembers: TeamMember[],
  shifts: Shift[],
  shiftStreaks: ShiftStreak
): RotaAssignments => {
  if (teamMembers.length === 0) return {};

  const assignments: RotaAssignments = {};
  
  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  let rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);
  
  fixedShiftMembers.forEach(member => {
    if (member.fixedShiftId) {
      assignments[member.id] = member.fixedShiftId;
    }
  });

  const assignedShiftCounts: Record<string, number> = {};
  shifts.forEach(s => assignedShiftCounts[s.id] = 0);

  fixedShiftMembers.forEach(m => {
    if (m.fixedShiftId && assignedShiftCounts[m.fixedShiftId] !== undefined) {
      assignedShiftCounts[m.fixedShiftId]++;
    }
  });
  
  // Identify members who MUST rotate due to streak
  const mustRotateMembers = rotatingMembers.filter(m => {
      const streak = shiftStreaks[m.id];
      return streak && streak.count >= 2;
  });
  const canStayMembers = rotatingMembers.filter(m => {
      const streak = shiftStreaks[m.id];
      return !streak || streak.count < 2;
  });
  
  // Attempt to assign shifts to members who must rotate first
  let availableMembers = shuffle([...mustRotateMembers, ...canStayMembers]);
  
  const assignShift = (shiftId: string, min: number, max: number) => {
    let count = assignedShiftCounts[shiftId] || 0;
    const membersToAssign: TeamMember[] = [];
    
    let membersToFill = min - count;
    if (membersToFill < 0) membersToFill = 0;

    const tempAvailable: TeamMember[] = [];

    while (membersToFill > 0 && availableMembers.length > 0) {
      const member = availableMembers.shift()!;
      // APAC -> US constraint
      if (shiftId === 'us' && shiftStreaks[member.id]?.shiftId === 'apac') {
          tempAvailable.push(member);
      } else {
          membersToAssign.push(member);
          membersToFill--;
      }
    }
    
    // Add back the members who were not eligible
    availableMembers.unshift(...tempAvailable);
    
    // If we couldn't find enough eligible members
    if (membersToFill > 0) {
        // This is a fallback - grab from the temp list if we absolutely have to
        while(membersToFill > 0 && tempAvailable.length > 0) {
            membersToAssign.push(tempAvailable.shift()!);
            membersToFill--;
        }
    }

    count = (assignedShiftCounts[shiftId] || 0) + membersToAssign.length;

    // Attempt to fill up to max (opportunistically)
    let potentialAdds = max - count;
    const membersToKeepForLater: TeamMember[] = [];
    const opportunisticMembers: TeamMember[] = [];

    while (potentialAdds > 0 && availableMembers.length > 0) {
        const member = availableMembers.shift()!;
        if (Math.random() > 0.5) {
             if (shiftId === 'us' && shiftStreaks[member.id]?.shiftId === 'apac') {
                membersToKeepForLater.push(member);
             } else {
                opportunisticMembers.push(member);
                potentialAdds--;
             }
        } else {
            membersToKeepForLater.push(member);
        }
    }
    
    membersToAssign.push(...opportunisticMembers);
    availableMembers.unshift(...membersToKeepForLater);

    membersToAssign.forEach(member => {
        assignments[member.id] = shiftId;
    });
    assignedShiftCounts[shiftId] = membersToAssign.length + (assignedShiftCounts[shiftId] || 0);
  };
  
  // Enforce constraints
  assignShift('apac', 1, 1);
  assignShift('us', 1, 1);
  assignShift('emea', 1, 2);

  // Assign remaining members to LATE EMEA
  shuffle(availableMembers).forEach(member => {
    assignments[member.id] = 'late_emea';
  });

  return assignments;
};
