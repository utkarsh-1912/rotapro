"use client";

import React from "react";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./ui/skeleton";
import { Button } from "./ui/button";
import { Pencil } from "lucide-react";
import { EditAssignmentDialog } from "./edit-assignment-dialog";
import type { TeamMember } from "@/lib/types";

export const RotaTable = React.forwardRef<HTMLDivElement>((props, ref) => {
  const { generationHistory, activeGenerationId, teamMembers: allTeamMembers, shifts } = useRotaStore();
  const [isMounted, setIsMounted] = React.useState(false);
  const [editState, setEditState] = React.useState<{ open: boolean; member?: TeamMember; shiftId?: string }>({ open: false });

  React.useEffect(() => setIsMounted(true), []);

  const activeGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const teamMembersInRota = React.useMemo(() => {
    if (!activeGeneration) return allTeamMembers;
    const members = activeGeneration.teamMembersAtGeneration || allTeamMembers;
    return members.filter(member => activeGeneration.assignments[member.id]);
  }, [activeGeneration, allTeamMembers]);

  if (!isMounted || !activeGeneration) {
    return (
      <div ref={ref}>
        <Skeleton className="h-8 w-full rounded-t-lg" />
        <div className="border-x border-b rounded-b-lg">
        <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const { assignments } = activeGeneration;

  const getShiftColor = (colorName: string | undefined) => {
    if (!colorName) return 'hsl(var(--muted))';
    const colorMap: { [key: string]: string } = {
        'bg-blue-200': 'hsl(210 100% 85%)',
        'bg-amber-200': 'hsl(40 96% 78%)',
        'bg-indigo-200': 'hsl(231 89% 82%)',
        'bg-emerald-200': 'hsl(145 63% 79%)',
        'bg-rose-200': 'hsl(347 90% 81%)',
    };
    return colorMap[colorName] || 'hsl(var(--muted))';
  }

  const handleEditClick = (member: TeamMember, shiftId: string) => {
    setEditState({ open: true, member, shiftId });
  };

  return (
    <>
      <div className="overflow-x-auto rounded-lg border bg-card" ref={ref}>
          <Table>
            <TableHeader>
              <TableRow>
                {teamMembersInRota.map((member) => (
                  <TableHead key={member!.id} className="text-center font-semibold">{member!.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {teamMembersInRota.map((member) => {
                    if (!member) return null;
                    const shiftId = assignments[member.id];
                    const shift = shiftId ? shiftMap.get(shiftId) : null;
                    return (
                      <TableCell key={member.id} className="text-center p-2 align-top h-24 group">
                         {shift ? (
                          <div className="flex flex-col items-center gap-1 relative">
                            <Badge
                              variant="secondary"
                              className="font-semibold text-base whitespace-nowrap"
                              style={{ backgroundColor: getShiftColor(shift.color) }}
                            >
                              {shift.name}
                            </Badge>
                            <div className="text-xs text-muted-foreground font-mono">
                              {shift.startTime} - {shift.endTime}
                            </div>
                             <Button
                                variant="ghost"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleEditClick(member, shift.id)}
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not Assigned</span>
                        )}
                      </TableCell>
                    );
                  })}
              </TableRow>
               {teamMembersInRota.length === 0 && (
                   <TableRow>
                      <TableCell colSpan={99} className="h-24 text-center text-muted-foreground">
                         No team members. Please add members in the Admin Panel.
                      </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
      </div>
      <EditAssignmentDialog 
        open={editState.open}
        onOpenChange={(open) => setEditState(prev => ({...prev, open}))}
        member={editState.member}
        currentShiftId={editState.shiftId}
      />
    </>
  );
});

RotaTable.displayName = "RotaTable";
