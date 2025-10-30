export interface TeamMember {
  id: string;
  name: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

// Rota is stored as a Record mapping date strings (YYYY-MM-DD) to assignments
// Assignments map a team member's ID to a shift ID
export type Rota = Record<string, Record<string, string>>;

export interface AppState {
  teamMembers: TeamMember[];
  shifts: Shift[];
  rota: Rota;
  startDate: string; // ISO string
  addTeamMember: (name: string) => void;
  updateTeamMember: (id: string, name: string) => void;
  deleteTeamMember: (id: string) => void;
  updateShift: (id: string, newShift: Partial<Shift>) => void;
  setRota: (newRota: Rota, newStartDate?: string) => void;
  generateRota: () => void;
  swapShifts: (date: string, memberId1: string, memberId2: string) => void;
  cloneRota: () => void;
}
