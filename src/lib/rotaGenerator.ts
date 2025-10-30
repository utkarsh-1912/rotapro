import { addDays, format } from "date-fns";
import type { TeamMember, Shift } from "./types";
import { type Rota } from "./types";

const getShiftSlots = (
  rotatingMembers: TeamMember[],
  shifts: Shift[]
): string[] => {
  const teamSize = rotatingMembers.length;
  if (teamSize === 0) return [];
  
  const slots: string[] = [];
  const shiftIds = shifts.map(s => s.id);
  
  const singleOccupancyShifts = ["apac", "us"];
  const multiOccupancyShifts = shiftIds.filter(id => !singleOccupancyShifts.includes(id));
  
  // Assign single occupancy shifts first
  singleOccupancyShifts.forEach(shiftId => {
    if (shiftIds.includes(shiftId)) {
      slots.push(shiftId);
    }
  });

  // Fill remaining slots with multi-occupancy shifts
  let currentMultiIndex = 0;
  while (slots.length < teamSize) {
    if (multiOccupancyShifts.length > 0) {
      slots.push(multiOccupancyShifts[currentMultiIndex % multiOccupancyShifts.length]);
      currentMultiIndex++;
    } else if (singleOccupancyShifts.length > 0) {
      // Fallback if not enough multi-occupancy shifts
      slots.push(singleOccupancyShifts[currentMultiIndex % singleOccupancyShifts.length]);
      currentMultiIndex++;
    } else {
      break; // No shifts available
    }
  }

  return slots.slice(0, teamSize);
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
  shifts: Shift[],
  startDate: string
): Rota => {
  if (teamMembers.length === 0) return {};

  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  const rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);
  
  const fixedShiftsRota = assignFixedShifts(fixedShiftMembers, startDate, 14);

  let rotatingShiftsRota: Rota = {};
  if (rotatingMembers.length > 0) {
      const shuffledRotatingMembers = [...rotatingMembers].sort(() => Math.random() - 0.5);
      const availableShiftSlots = getShiftSlots(shuffledRotatingMembers, shifts);
      rotatingShiftsRota = assignShiftsForPeriod(shuffledRotatingMembers, availableShiftSlots, startDate, 14);
  }

  return mergeRotas(fixedShiftsRota, rotatingShiftsRota);
};


export const generateNextRota = (
  currentRota: Rota,
  teamMembers: TeamMember[],
  shifts: Shift[],
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
      // Create a deterministic order for rotation
      const sortedRotatingMembers = [...rotatingMembers].sort((a, b) => a.id.localeCompare(b.id));
      
      const lastDateString = format(addDays(new Date(currentStartDate), 13), "yyyy-MM-dd");
      const lastDayAssignments = currentRota[lastDateString] || {};

      const shiftSlots = getShiftSlots(sortedRotatingMembers, shifts);
      if(shiftSlots.length === 0) return { newRota: fixedShiftsRota, newStartDate };

      // Determine the shift of each member on the last day of the current rota
      const memberLastShifts = sortedRotatingMembers.map(member => {
        return lastDayAssignments[member.id] || null;
      });

      // Simple rotation: move the last member's shift to the first member, and so on.
      const newShifts = [memberLastShifts[memberLastShifts.length - 1], ...memberLastShifts.slice(0, memberLastShifts.length - 1)];

      const memberToShiftMap: Record<string, string> = {};
      sortedRotatingMembers.forEach((member, index) => {
        const newShiftId = newShifts[index];
        if (newShiftId) {
          memberToShiftMap[member.id] = newShiftId;
        } else {
          // If a member didn't have a shift (e.g., newly added), assign one from the available slots
          memberToShiftMap[member.id] = shiftSlots[index % shiftSlots.length];
        }
      });
      
      rotatingShiftsRota = assignShiftsForPeriod(
        sortedRotatingMembers, // Use sorted members for consistent assignment
        Object.values(memberToShiftMap),
        newStartDate,
        14
      );
  }

  const newTotalRota = mergeRotas(fixedShiftsRota, rotatingShiftsRota);

  return { newRota: newTotalRota, newStartDate };
};
