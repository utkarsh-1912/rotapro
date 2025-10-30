"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { addDays, format, parseISO } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-4"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const shiftMap = new Map(shifts.map((s) => [s.id, s]));
  const dates = Array.from({ length: 14 }, (_, i) => addDays(parseISO(startDate), i));

  const getShiftColor = (colorName: string) => {
    // This is a workaround to make Tailwind CSS aware of these classes.
    // The actual color is applied via a style attribute for dynamicism.
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
        <ScrollArea>
          <Table className="min-w-full whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card z-10 w-[150px] md:w-[200px]">Member</TableHead>
                {dates.map((date) => (
                  <TableHead key={date.toISOString()} className="text-center">
                    <div className="flex flex-col items-center">
                      <span>{format(date, "EEE")}</span>
                      <span className="font-normal text-muted-foreground">{format(date, "d MMM")}</span>
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="sticky left-0 bg-card z-10 font-medium">{member.name}</TableCell>
                  {dates.map((date) => {
                    const dateString = format(date, "yyyy-MM-dd");
                    const shiftId = rota[dateString]?.[member.id];
                    const shift = shiftId ? shiftMap.get(shiftId) : null;
                    return (
                      <TableCell key={date.toISOString()} className="text-center p-2">
                        {shift ? (
                          <Badge
                            variant="secondary"
                            className="font-semibold text-xs"
                            style={{ backgroundColor: getShiftColor(shift.color) }}
                          >
                            {shift.name}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Off</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
               {teamMembers.length === 0 && (
                <TableRow>
                    <TableCell colSpan={15} className="h-24 text-center text-muted-foreground">
                       No team members. Please add members in the Admin Panel.
                    </TableCell>
                </TableRow>
            )}
            </TableBody>
          </Table>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
