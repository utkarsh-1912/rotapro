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
    
    // Fill minimum requirement
    while(count < min && availableMembers.length > 0) {
        const member = availableMembers.shift()!;
        membersToAssign.push(member);
        count++;
    }

    // Attempt to fill up to max
    while(count < max && availableMembers.length > 0) {
        // Simple random chance to add more members up to the max
        if (Math.random() > 0.5) {
            const member = availableMembers.shift()!;
            membersToAssign.push(member);
            count++;
        } else {
            break;
        }
    }
    
    membersToAssign.forEach(member => {
        assignments[member.id] = shiftId;
    });
    assignedShiftCounts[shiftId] = count;
  };
  
  // Enforce constraints
  assignShift('apac', 1, 1);
  assignShift('us', 1, 1);
  assignShift('emea', 1, 2);

  // Assign remaining members to LATE EMEA
  availableMembers.forEach(member => {
    assignments[member.id] = 'late_emea';
  });

  return assignments;
};
