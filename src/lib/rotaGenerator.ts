import { addDays, format } from "date-fns";
import type { TeamMember, Shift } from "./types";
import { type Rota } from "./types";

// Helper to shuffle an array
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

const assignShiftsForPeriod = (
  assignments: Record<string, string>,
  startDate: string,
  days: number
): Rota => {
  const rota: Rota = {};
  for (let i = 0; i < days; i++) {
    const date = format(addDays(new Date(startDate), i), "yyyy-MM-dd");
    rota[date] = { ...assignments };
  }
  return rota;
};

export const generateNewRota = (
  teamMembers: TeamMember[],
  shifts: Shift[],
  startDate: string
): Rota => {
  if (teamMembers.length === 0) return {};

  const assignments: Record<string, string> = {};
  
  // 1. Handle fixed shifts first
  const fixedShiftMembers = teamMembers.filter(m => m.fixedShiftId);
  const rotatingMembers = teamMembers.filter(m => !m.fixedShiftId);
  
  fixedShiftMembers.forEach(member => {
    if (member.fixedShiftId) {
      assignments[member.id] = member.fixedShiftId;
    }
  });

  // 2. Apply constraints to rotating members
  let availableMembers = shuffle([...rotatingMembers]);
  const assignedShiftCounts: Record<string, number> = {};
  shifts.forEach(s => assignedShiftCounts[s.id] = 0);

  // Count fixed shifts towards constraints
  fixedShiftMembers.forEach(m => {
    if (m.fixedShiftId && assignedShiftCounts[m.fixedShiftId] !== undefined) {
      assignedShiftCounts[m.fixedShiftId]++;
    }
  });

  // Exactly 1 APAC
  if (assignedShiftCounts['apac'] < 1 && availableMembers.length > 0) {
    const member = availableMembers.pop()!;
    assignments[member.id] = 'apac';
    assignedShiftCounts['apac']++;
  }

  // Exactly 1 US
  if (assignedShiftCounts['us'] < 1 && availableMembers.length > 0) {
    const member = availableMembers.pop()!;
    assignments[member.id] = 'us';
    assignedShiftCounts['us']++;
  }
  
  // At least 1, at most 2 EMEA
  let emeaCount = assignedShiftCounts['emea'];
  while (emeaCount < 2 && availableMembers.length > 0) {
      // Ensure at least one person is on EMEA if possible
      if (emeaCount === 0) {
          const member = availableMembers.pop()!;
          assignments[member.id] = 'emea';
          emeaCount++;
      }
      // Add a second person if available and coin toss is successful (or if we have plenty of people)
      else if (emeaCount === 1 && (availableMembers.length > 2 || Math.random() > 0.5)) {
          const member = availableMembers.pop()!;
          assignments[member.id] = 'emea';
          emeaCount++;
      } else {
          break;
      }
  }

  // Assign remaining to LATE EMEA
  availableMembers.forEach(member => {
    assignments[member.id] = 'late_emea';
  });

  return assignShiftsForPeriod(assignments, startDate, 14);
};


export const generateNextRota = (
  teamMembers: TeamMember[],
  shifts: Shift[],
  currentStartDate: string
): { newRota: Rota, newStartDate: string } => {
  const newStartDate = format(addDays(new Date(currentStartDate), 14), "yyyy-MM-dd");
  
  // For the "next" rota, we just generate a new random one for the new period.
  const newRota = generateNewRota(teamMembers, shifts, newStartDate);
  
  return { newRota, newStartDate };
};
