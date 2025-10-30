import { addDays, format, startOfWeek } from "date-fns";
import type { TeamMember, Shift, Rota } from "./types";

// APAC=1, US=1, EMEA=1-2, LATE EMEA=rest
const getShiftSlots = (teamSize: number): string[] => {
  const slots: string[] = [];
  slots.push("apac"); // 1 APAC
  slots.push("us");   // 1 US
  
  // 1 EMEA if team is 5 or less, 2 if more
  const emeaCount = teamSize <= 5 ? 1 : 2;
  for (let i = 0; i < emeaCount; i++) {
    slots.push("emea");
  }

  // LATE EMEA for the rest
  const lateEmeaCount = teamSize - slots.length;
  for (let i = 0; i < lateEmeaCount; i++) {
    slots.push("late_emea");
  }
  
  return slots;
};

/**
 * Generates a completely new 14-day rota.
 * It assigns each team member to a shift for the entire 14-day period.
 * The assignment is based on predefined shift slot counts.
 * Team members are shuffled to ensure variety in initial assignments.
 */
export const generateNewRota = (
  teamMembers: TeamMember[],
  startDate: string
): Rota => {
  const newRota: Rota = {};
  if (teamMembers.length === 0) return newRota;

  // Shuffle members for initial generation to mix things up
  const shuffledMembers = [...teamMembers].sort(() => Math.random() - 0.5);
  const shiftSlots = getShiftSlots(shuffledMembers.length);

  const memberToShiftMap: Record<string, string> = {};
  shuffledMembers.forEach((member, index) => {
    // Assign a shift slot. If more members than slots, they are off.
    const shiftId = shiftSlots[index % shiftSlots.length];
    if (shiftId) {
        memberToShiftMap[member.id] = shiftId;
    }
  });

  for (let i = 0; i < 14; i++) {
    const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
    newRota[date] = {};
    teamMembers.forEach((member) => {
      const assignedShift = memberToShiftMap[member.id];
      if (assignedShift) {
        newRota[date][member.id] = assignedShift;
      }
    });
  }

  return newRota;
};


/**
 * Generates the next 14-day rota by rotating team members through shift slots.
 * This ensures that headcounts per shift are maintained while people rotate.
 * For example, the person on 'APAC' shift will move to the next person's shift in the line.
 */
export const generateNextRota = (
  currentRota: Rota,
  teamMembers: TeamMember[],
  currentStartDate: string
): { newRota: Rota, newStartDate: string } => {
  const newStartDate = addDays(new Date(currentStartDate), 14).toISOString();
  if (teamMembers.length === 0) {
    return { newRota: {}, newStartDate };
  }

  // To ensure consistent rotation, we need a stable order of members.
  const sortedMembers = [...teamMembers].sort((a, b) => a.id.localeCompare(b.id));

  // Rotate the list of members: the first member moves to the end.
  const rotatedMembers = [...sortedMembers];
  const firstMember = rotatedMembers.shift();
  if(firstMember) {
      rotatedMembers.push(firstMember);
  }
  
  const shiftSlots = getShiftSlots(sortedMembers.length);

  const memberToShiftMap: Record<string, string> = {};
  rotatedMembers.forEach((member, index) => {
    const shiftId = shiftSlots[index % shiftSlots.length];
    if (shiftId) {
        memberToShiftMap[member.id] = shiftId;
    }
  });

  const nextRota: Rota = {};
  for (let i = 0; i < 14; i++) {
    const date = format(addDays(new Date(newStartDate), i), "yyyy-MM-dd");
    nextRota[date] = {};
    teamMembers.forEach((member) => {
       const assignedShift = memberToShiftMap[member.id];
       if (assignedShift) {
         nextRota[date][member.id] = assignedShift;
       }
    });
  }
  
  return { newRota: nextRota, newStartDate };
};
