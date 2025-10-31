
"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { differenceInCalendarWeeks, parseISO, startOfWeek, endOfWeek, addDays, format } from "date-fns";
import { LifeBuoy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

type AdhocStatus = Record<string, Record<number, boolean>>;

export default function SupportRotaPage() {
  const { generationHistory, activeGenerationId, shifts, teamMembers } = useRotaStore();
  const [adhocStatus, setAdhocStatus] = React.useState<AdhocStatus>({});

  const activeGeneration = React.useMemo(() =>
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);
  
  const handleAdhocChange = (memberId: string, weekIndex: number) => {
    setAdhocStatus(prev => ({
        ...prev,
        [memberId]: {
            ...prev[memberId],
            [weekIndex]: !prev[memberId]?.[weekIndex]
        }
    }));
  };

  if (!activeGeneration) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
              <LifeBuoy className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>No Active Rota</CardTitle>
            <CardDescription>
              A main rota must be generated and active before a support rota can be displayed.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const rotaStartDate = parseISO(activeGeneration.startDate);
  const rotaEndDate = parseISO(activeGeneration.endDate);
  
  const weeks = [];
  let currentWeekStart = startOfWeek(rotaStartDate, { weekStartsOn: 1 });

  while(currentWeekStart <= rotaEndDate) {
    const currentWeekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    weeks.push({
        start: currentWeekStart,
        end: currentWeekEnd > rotaEndDate ? rotaEndDate : currentWeekEnd
    });
    currentWeekStart = addDays(currentWeekStart, 7);
  }

  const teamMembersInRota = activeGeneration.teamMembersAtGeneration || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Ad-hoc Support Planning</CardTitle>
          <CardDescription>
            Assign team members to ad-hoc support duty for each week of the active rota period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-card z-10">Team Member</TableHead>
                    {weeks.map((week, index) => (
                      <TableHead key={index} className="text-center">
                        <div>On Ad-hoc</div>
                        <div className="font-normal text-muted-foreground whitespace-nowrap">{format(week.start, 'd MMM')} - {format(week.end, 'd MMM')}</div>
                      </TableHead>
                    ))}
                    <TableHead>Adhoc Queries / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembersInRota.map(member => {
                    const shiftId = activeGeneration.assignments[member.id];
                    const shift = shiftId ? shiftMap.get(shiftId) : null;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium sticky left-0 bg-card z-10">
                          <div>{member.name}</div>
                          {shift ? (
                            <Badge
                              variant="secondary"
                              className="font-normal mt-1"
                              style={{ 
                                backgroundColor: shift.color,
                                color: 'hsl(var(--card-foreground))' 
                              }}
                            >
                              {shift.name}
                            </Badge>
                          ) : (
                             <Badge variant="outline" className="font-normal mt-1">Off</Badge>
                          )}
                        </TableCell>

                        {weeks.map((_, index) => (
                           <TableCell key={index} className="text-center">
                             <Checkbox
                               checked={!!adhocStatus[member.id]?.[index]}
                               onCheckedChange={() => handleAdhocChange(member.id, index)}
                             />
                           </TableCell>
                        ))}
                        
                        <TableCell>
                           <Textarea placeholder="Log any adhoc queries here..." className="text-xs" rows={1} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {teamMembersInRota.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={weeks.length + 2} className="text-center text-muted-foreground h-24">
                           No team members were part of this rota generation.
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
