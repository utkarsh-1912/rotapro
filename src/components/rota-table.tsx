"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./ui/skeleton";

export const RotaTable = React.forwardRef<HTMLDivElement>((props, ref) => {
  const { generationHistory, activeGenerationId, teamMembers: allTeamMembers, shifts } = useRotaStore();
  
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const activeGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const teamMembers = React.useMemo(() => {
    if (!activeGeneration) return allTeamMembers;
    
    // Get all members who have an assignment in this generation
    const membersInGeneration = new Map(Object.keys(activeGeneration.assignments).map(memberId => {
      const member = allTeamMembers.find(m => m.id === memberId);
      return [memberId, member];
    }));

    // If a member is deleted, they might not be in `allTeamMembers` anymore,
    // so we need to reconstruct them from the generation's metadata if available.
    return Object.keys(activeGeneration.assignments).map(memberId => {
      let member = membersInGeneration.get(memberId);
      if (!member) {
        // This member was likely deleted. Let's find them in older history.
        for (let i = generationHistory.length - 1; i >= 0; i--) {
            const oldMember = generationHistory[i].teamMembersAtGeneration?.find(m => m.id === memberId);
            if (oldMember) {
                member = oldMember;
                break;
            }
        }
      }
      return member;
    }).filter(Boolean); // Filter out any nulls just in case
  }, [activeGeneration, allTeamMembers, generationHistory]);


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

  const getShiftColor = (colorName: string) => {
    const colorMap: { [key: string]: string } = {
        'bg-blue-200': 'hsl(210 100% 85%)',
        'bg-amber-200': 'hsl(40 96% 78%)',
        'bg-indigo-200': 'hsl(231 89% 82%)',
        'bg-emerald-200': 'hsl(145 63% 79%)',
        'bg-rose-200': 'hsl(347 90% 81%)',
    };
    return colorMap[colorName] || 'hsl(var(--muted))';
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-card" ref={ref}>
        <Table>
          <TableHeader>
            <TableRow>
              {teamMembers.map((member) => (
                <TableHead key={member!.id} className="text-center font-semibold">{member!.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {teamMembers.map((member) => {
                  if (!member) return null;
                  const shiftId = assignments[member.id];
                  const shift = shiftId ? shiftMap.get(shiftId) : null;
                  return (
                    <TableCell key={member.id} className="text-center p-2 align-top h-24">
                       {shift ? (
                        <div className="flex flex-col items-center gap-1">
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
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Off</span>
                      )}
                    </TableCell>
                  );
                })}
            </TableRow>
             {teamMembers.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={99} className="h-24 text-center text-muted-foreground">
                       No team members. Please add members in the Admin Panel.
                    </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
    </div>
  );
});

RotaTable.displayName = "RotaTable";