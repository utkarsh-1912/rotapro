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

const assignShiftsForPeriod = (
    members: TeamMember[],
    shiftSlots: string[],
    startDate: string,
    days: number
): Rota => {
    const rota: Rota = {};
    const memberToShiftMap: Record<string, string> = {};

    members.forEach((member, index) => {
        const shiftId = shiftSlots[index % shiftSlots.length];
        if (shiftId) {
            memberToShiftMap[member.id] = shiftId;
        }
    });

    for (let i = 0; i < days; i++) {
        const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
        rota[date] = {};
        members.forEach((member) => {
            const assignedShift = memberToShiftMap[member.id];
            if (assignedShift) {
                rota[date][member.id] = assignedShift;
            }
        });
    }
    return rota;
};

const assignFixedShifts = (
  fixedShiftMembers: TeamMember[],
  startDate: string,
  days: number
): Rota => {
  const rota: Rota = {};
  for (let i = 0; i < days; i++) {
      const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
      rota[date] = {};
      fixedShiftMembers.forEach(member => {
          if (member.fixedShiftId) {
              rota[date][member.id] = member.fixedShiftId;
          }
      });
  }
  return rota;
};

const mergeRotas = (rota1: Rota, rota2: Rota): Rota => {
    const merged: Rota = { ...rota1 };
    for (const date in rota2) {
        if (merged[date]) {
            merged[date] = { ...merged[date], ...rota2[date] };
        } else {
            merged[date] = rota2[date];
        }
    }
    return merged;
};

export const generateNewRota = (
  teamMembers: TeamMember[],
  startDate: string
): Rota => {
  if (teamMembers.length === 0) return {};

  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  const rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);
  
  const fixedShiftsRota = assignFixedShifts(fixedShiftMembers, startDate, 14);

  let rotatingShiftsRota: Rota = {};
  if (rotatingMembers.length > 0) {
      const shuffledRotatingMembers = [...rotatingMembers].sort(() => Math.random() - 0.5);
      const availableShiftSlots = getShiftSlots(shuffledRotatingMembers.length);
      rotatingShiftsRota = assignShiftsForPeriod(shuffledRotatingMembers, availableShiftSlots, startDate, 14);
  }

  return mergeRotas(fixedShiftsRota, rotatingShiftsRota);
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
  
  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  const rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);

  const fixedShiftsRota = assignFixedShifts(fixedShiftMembers, newStartDate, 14);

  let rotatingShiftsRota: Rota = {};
  if (rotatingMembers.length > 0) {
      const sortedRotatingMembers = [...rotatingMembers].sort((a, b) => a.id.localeCompare(b.id));
      const shiftSlots = getShiftSlots(sortedRotatingMembers.length);
      
      const lastDateOfCurrentPeriod = format(addDays(new Date(currentStartDate), 13), "yyyy-MM-dd");
      const lastDayAssignments = currentRota[lastDateOfCurrentPeriod] || {};

      const previousShiftIndices: Record<string, number> = {};
      sortedRotatingMembers.forEach(member => {
          const shiftId = lastDayAssignments[member.id];
          const index = shiftSlots.indexOf(shiftId);
          previousShiftIndices[member.id] = index > -1 ? index : 0;
      });

      const nextShiftSlots = shiftSlots.map((_, index, arr) => arr[(index + 1) % arr.length]);

      const memberToShiftMap: Record<string, string> = {};
      sortedRotatingMembers.forEach((member, index) => {
        const lastShiftIndex = previousShiftIndices[member.id] ?? index;
        const nextShiftIndex = (lastShiftIndex + 1) % shiftSlots.length;
        const newShiftId = shiftSlots[nextShiftIndex];
        memberToShiftMap[member.id] = newShiftId;
      });

      // Simple rotation: shift the array of members
      const rotatedMembers = [...sortedRotatingMembers];
      const memberToRotate = rotatedMembers.shift();
      if(memberToRotate) rotatedMembers.push(memberToRotate);

      rotatingShiftsRota = assignShiftsForPeriod(rotatedMembers, shiftSlots, newStartDate, 14);
  }

  const newTotalRota = mergeRotas(fixedShiftsRota, rotatingShiftsRota);

  return { newRota: newTotalRota, newStartDate };
};
