"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./ui/skeleton";

export function RotaTable() {
  const { generationHistory, activeGenerationId, teamMembers, shifts } = useRotaStore();
  
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const activeGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  if (!isMounted || !activeGeneration) {
    return (
      <div>
        <Skeleton className="h-8 w-full rounded-t-lg" />
        <Skeleton className="h-12 w-full rounded-b-lg" />
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
    <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {teamMembers.map((member) => (
                <TableHead key={member.id} className="text-center font-semibold">{member.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              {teamMembers.map((member) => {
                  const shiftId = assignments[member.id];
                  const shift = shiftId ? shiftMap.get(shiftId) : null;
                  return (
                    <TableCell key={member.id} className="text-center p-4">
                       {shift ? (
                        <Badge
                          variant="secondary"
                          className="font-semibold text-base whitespace-nowrap"
                          style={{ backgroundColor: getShiftColor(shift.color) }}
                        >
                          {shift.name}
                        </Badge>
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
}
