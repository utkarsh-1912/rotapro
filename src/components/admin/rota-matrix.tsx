"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { Badge } from "../ui/badge";

export function RotaMatrix() {
    const { teamMembers, generationHistory, shifts } = useRotaStore();
    
    const sortedHistory = React.useMemo(() =>
        [...generationHistory].sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
        [generationHistory]
    );

    const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);

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
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Rota Matrix</CardTitle>
                <CardDescription>
                    Historical view of shift assignments for all team members across all rota periods.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-semibold sticky left-0 bg-card z-10">Member</TableHead>
                                {sortedHistory.map(gen => (
                                    <TableHead key={gen.id} className="text-center font-semibold">
                                        {format(parseISO(gen.startDate), 'd MMM yyyy')}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teamMembers.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium sticky left-0 bg-card z-10">{member.name}</TableCell>
                                    {sortedHistory.map(gen => {
                                        const assignmentId = gen.assignments[member.id];
                                        const shift = assignmentId ? shiftMap.get(assignmentId) : null;
                                        
                                        // Check if the member existed at the time of generation
                                        const wasMemberInTeam = gen.teamMembersAtGeneration?.some(m => m.id === member.id) ?? true;

                                        if (!wasMemberInTeam) {
                                          return (
                                            <TableCell key={gen.id} className="text-center text-muted-foreground/50 text-xs">
                                              Not in team
                                            </TableCell>
                                          );
                                        }

                                        return (
                                            <TableCell key={gen.id} className="text-center">
                                                {shift ? (
                                                    <Badge
                                                        variant="secondary"
                                                        style={{ backgroundColor: getShiftColor(shift.color) }}
                                                    >
                                                        {shift.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">Off</span>
                                                )}
                                            </TableCell>
                                        )
                                    })}
                                </TableRow>
                            ))}
                             {teamMembers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={sortedHistory.length + 1} className="text-center text-muted-foreground h-24">
                                        No team members found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                 {sortedHistory.length === 0 && teamMembers.length > 0 && (
                    <div className="text-center text-muted-foreground py-10">
                        No rota history found. Generate your first rota to see the matrix.
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
