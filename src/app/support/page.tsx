
"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { differenceInCalendarWeeks, parseISO } from "date-fns";
import { LifeBuoy } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function SupportRotaPage() {
  const { generationHistory, activeGenerationId, shifts, teamMembers } = useRotaStore();
  const [selectedWeek, setSelectedWeek] = React.useState(1);

  const activeGeneration = React.useMemo(() =>
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);
  const memberMap = React.useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

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

  const startDate = parseISO(activeGeneration.startDate);
  const endDate = parseISO(activeGeneration.endDate);
  const totalWeeks = differenceInCalendarWeeks(endDate, startDate, { weekStartsOn: 1 }) + 1;

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
          <CardTitle>Support Rota</CardTitle>
          <CardDescription>
            Weekly shift assignments for handling ad-hoc support queries.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {totalWeeks > 1 && (
              <div className="flex items-center space-x-4 rounded-md border p-4">
                <Label className="font-semibold">Select Week:</Label>
                {[...Array(totalWeeks)].map((_, i) => (
                  <div key={i + 1} className="flex items-center space-x-2">
                    <Checkbox
                      id={`week-${i + 1}`}
                      checked={selectedWeek === i + 1}
                      onCheckedChange={() => setSelectedWeek(i + 1)}
                    />
                    <Label htmlFor={`week-${i + 1}`}>Week {i + 1}</Label>
                  </div>
                ))}
              </div>
            )}
            
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Assigned Shift (Week {selectedWeek})</TableHead>
                    <TableHead>Adhoc Queries / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembersInRota.map(member => {
                    const shiftId = activeGeneration.assignments[member.id];
                    const shift = shiftId ? shiftMap.get(shiftId) : null;
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.name}</TableCell>
                        <TableCell>
                          {shift ? (
                            <Badge
                              variant="secondary"
                              style={{ 
                                backgroundColor: shift.color,
                                color: 'hsl(var(--card-foreground))' 
                              }}
                            >
                              {shift.name} ({shift.startTime} - {shift.endTime})
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Off</span>
                          )}
                        </TableCell>
                        <TableCell>
                           <Textarea placeholder="Log any adhoc queries here..." className="text-xs" rows={1} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {teamMembersInRota.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
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
