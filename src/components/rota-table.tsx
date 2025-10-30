"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "./ui/skeleton";

export function RotaTable() {
  const { rota, teamMembers, shifts, startDate } = useRotaStore((state) => ({
    rota: state.rota,
    teamMembers: state.teamMembers,
    shifts: state.shifts,
    startDate: state.startDate,
  }));

  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  if (!isMounted) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  const shiftMap = new Map(shifts.map((s) => [s.id, s]));

  // Since the shift is the same for the whole period, we can just take the assignments from the first day.
  const firstDateOfRota = startDate ? Object.keys(rota).find(d => d >= startDate) : undefined;
  const assignmentsForPeriod = firstDateOfRota ? rota[firstDateOfRota] : {};

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
    <Card>
      <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {teamMembers.map((member) => (
                  <TableHead key={member.id} className="text-center">{member.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {teamMembers.map((member) => {
                    const shiftId = assignmentsForPeriod ? assignmentsForPeriod[member.id] : null;
                    const shift = shiftId ? shiftMap.get(shiftId) : null;
                    return (
                      <TableCell key={member.id} className="text-center p-4">
                         {shift ? (
                          <Badge
                            variant="secondary"
                            className="font-semibold text-base"
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
      </CardContent>
    </Card>
  );
}
