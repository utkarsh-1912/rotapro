import type { User } from "firebase/auth";

export interface TeamMember {
  id: string;
  name: string;
  fixedShiftId?: string;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  color: string;
}

// Assignments map a team member's ID to a shift ID
export type RotaAssignments = Record<string, string | undefined>;

// A single generated rota period
export interface RotaGeneration {
  id: string; // Unique ID for this generation, e.g., a timestamp
  startDate: string; // ISO string for the start of this period
  assignments: RotaAssignments;
}

// Tracks how many consecutive periods a member has had the same shift
export type ShiftStreak = Record<string, { shiftId: string | null; count: number }>;

export interface AppState {
  teamMembers: TeamMember[];
  shifts: Shift[];
  generationHistory: RotaGeneration[];
  activeGenerationId: string | null;
  addTeamMember: (name: string, fixedShiftId?: string) => void;
  updateTeamMember: (id: string, updates: Partial<Pick<TeamMember, 'name' | 'fixedShiftId'>>) => void;
  deleteTeamMember: (id: string) => void;
  updateShift: (id: string, newShift: Partial<Shift>) => void;
  generateNewRota: (startDate: Date) => void;
  swapShifts: (memberId1: string, memberId2: string) => void;
  deleteGeneration: (generationId: string) => void;
  setActiveGenerationId: (generationId: string | null) => void;
}

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
};

export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}
