import { addDays, format } from "date-fns";
import type { TeamMember } from "./types";
import { type Rota } from "./types";

const getShiftSlots = (teamSize: number): string[] => {
  const slots: string[] = [];
  slots.push("apac"); // 1 APAC
  slots.push("us");   // 1 US
  
  const emeaCount = teamSize <= 5 ? 1 : 2;
  for (let i = 0; i < emeaCount; i++) {
    slots.push("emea");
  }

  const lateEmeaCount = teamSize - slots.length;
  for (let i = 0; i < lateEmeaCount; i++) {
    slots.push("late_emea");
  }
  
  return slots;
};


const assignShifts = (members: TeamMember[], rota: Rota, startDate: string, days: number) => {
    const fixedShiftMembers = members.filter(m => m.fixedShiftId);
    const rotatingMembers = members.filter(m => !m.fixedShiftId);

    // Assign fixed shifts first
    for (let i = 0; i < days; i++) {
        const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
        if (!rota[date]) rota[date] = {};

        fixedShiftMembers.forEach(member => {
            if (member.fixedShiftId) {
                rota[date][member.id] = member.fixedShiftId;
            }
        });
    }

    if (rotatingMembers.length > 0) {
        const shuffledRotatingMembers = [...rotatingMembers].sort(() => Math.random() - 0.5);
        const availableShiftSlots = getShiftSlots(shuffledRotatingMembers.length);

        const memberToShiftMap: Record<string, string> = {};
        shuffledRotatingMembers.forEach((member, index) => {
            const shiftId = availableShiftSlots[index % availableShiftSlots.length];
            if (shiftId) {
                memberToShiftMap[member.id] = shiftId;
            }
        });

        for (let i = 0; i < days; i++) {
            const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
            if (!rota[date]) rota[date] = {};
            rotatingMembers.forEach((member) => {
                const assignedShift = memberToShiftMap[member.id];
                if (assignedShift) {
                    rota[date][member.id] = assignedShift;
                }
            });
        }
    }
};

export const generateNewRota = (
  teamMembers: TeamMember[],
  startDate: string
): Rota => {
  const newRota: Rota = {};
  if (teamMembers.length === 0) return newRota;
  assignShifts(teamMembers, newRota, startDate, 14);
  return newRota;
};


export const generateNextRota = (
  currentRota: Rota,
  teamMembers: TeamMember[],
  currentStartDate: string
): { newRota: Rota, newStartDate: string } => {
  const newStartDate = addDays(new Date(currentStartDate), 14).toISOString();
  if (teamMembers.length === 0) {
    return { newRota: {}, newStartDate };
  }
  
  const nextRota: Rota = {};

  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  const rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);

  // Assign fixed shifts for the next period
  for (let i = 0; i < 14; i++) {
      const date = format(addDays(new Date(newStartDate), i), "yyyy-MM-dd");
      if (!nextRota[date]) nextRota[date] = {};

      fixedShiftMembers.forEach(member => {
          if (member.fixedShiftId) {
              nextRota[date][member.id] = member.fixedShiftId;
          }
      });
  }

  // Rotate the remaining members
  if (rotatingMembers.length > 0) {
    const sortedRotatingMembers = [...rotatingMembers].sort((a, b) => a.id.localeCompare(b.id));

    // Rotate the list of members: the first member moves to the end.
    const rotatedMembers = [...sortedRotatingMembers];
    const firstMember = rotatedMembers.shift();
    if(firstMember) {
        rotatedMembers.push(firstMember);
    }
    
    const shiftSlots = getShiftSlots(sortedRotatingMembers.length);

    const memberToShiftMap: Record<string, string> = {};
    rotatedMembers.forEach((member, index) => {
      const shiftId = shiftSlots[index % shiftSlots.length];
      if (shiftId) {
          memberToShiftMap[member.id] = shiftId;
      }
    });

    for (let i = 0; i < 14; i++) {
      const date = format(addDays(new Date(newStartDate), i), "yyyy-MM-dd");
      if (!nextRota[date]) nextRota[date] = {};
      rotatingMembers.forEach((member) => {
         const assignedShift = memberToShiftMap[member.id];
         if (assignedShift) {
           nextRota[date][member.id] = assignedShift;
         }
      });
    }
  }
  
  return { newRota: nextRota, newStartDate };
};
