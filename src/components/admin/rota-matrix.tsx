
"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, addDays } from "date-fns";
import { Badge } from "../ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationFirst, PaginationLast } from "../ui/pagination";
import { Recycle, Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export function RotaMatrix() {
    const { teamMembers, generationHistory, shifts } = useRotaStore();
    const [currentPage, setCurrentPage] = React.useState(0);
    const { toast } = useToast();
    const itemsPerPage = 5;
    
    const sortedHistory = React.useMemo(() =>
        [...generationHistory].sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime()),
        [generationHistory]
    );

    const pageCount = Math.ceil(sortedHistory.length / itemsPerPage);
    const paginatedHistory = sortedHistory.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);
    
    const handleExport = () => {
        if (generationHistory.length === 0) {
            toast({
                variant: "destructive",
                title: "Export Failed",
                description: "There is no rota history to export.",
            });
            return;
        }

        const header = ["Member", ...sortedHistory.map(gen => {
            const startDate = parseISO(gen.startDate);
            const endDate = addDays(startDate, 13);
            return `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM yyyy')}`;
        })];

        const rows = teamMembers.map(member => {
            const memberRow = [member.name];
            sortedHistory.forEach(gen => {
                const shiftId = gen.assignments[member.id];
                const shift = shiftId ? shiftMap.get(shiftId) : null;
                const wasMemberInTeam = gen.teamMembersAtGeneration?.some(m => m.id === member.id) ?? true;

                if (!wasMemberInTeam) {
                    memberRow.push("Not in team");
                } else if (shift) {
                    memberRow.push(shift.name);
                } else {
                    memberRow.push("Off");
                }
            });
            return memberRow;
        });

        downloadCsv([header, ...rows], "rota-matrix-history.csv");
        toast({
            title: "Export Successful",
            description: "The complete rota matrix history has been downloaded as a CSV file.",
        });
    };
    
    return (
        <TooltipProvider>
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Rota Matrix</CardTitle>
                        <CardDescription>
                            Historical view of shift assignments for all team members across all rota periods.
                        </CardDescription>
                    </div>
                    <Button variant="outline" onClick={handleExport} disabled={generationHistory.length === 0}>
                        <Download /> Export as CSV
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-semibold sticky left-0 bg-card z-10">Member</TableHead>
                                    {paginatedHistory.map(gen => {
                                        const startDate = parseISO(gen.startDate);
                                        const endDate = addDays(startDate, 13);
                                        return (
                                            <TableHead key={gen.id} className="text-center font-semibold whitespace-nowrap">
                                                {format(startDate, 'd')} - {format(endDate, 'd MMM yyyy')}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teamMembers.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium sticky left-0 bg-card z-10">{member.name}</TableCell>
                                        {paginatedHistory.map(gen => {
                                            const assignmentId = gen.assignments[member.id];
                                            const shift = assignmentId ? shiftMap.get(assignmentId) : null;
                                            const isOverridden = gen.manualOverrides?.includes(member.id);
                                            
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
                                                            style={{ 
                                                                backgroundColor: shift.color,
                                                                color: 'hsl(var(--card-foreground))' 
                                                            }}
                                                        >
                                                            {shift.name}
                                                            {isOverridden && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Recycle className="h-3 w-3 ml-1.5 inline-block" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Shift was manually changed</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
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
                                        <TableCell colSpan={paginatedHistory.length + 1} className="text-center text-muted-foreground h-24">
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
                {pageCount > 1 && (
                    <CardFooter>
                        <Pagination>
                            <PaginationContent>
                                <PaginationItem>
                                    <PaginationFirst 
                                        onClick={() => setCurrentPage(0)}
                                        className={currentPage === 0 ? "pointer-events-none opacity-50" : undefined}
                                    />
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationPrevious 
                                        onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))} 
                                        className={currentPage === 0 ? "pointer-events-none opacity-50" : undefined}
                                    />
                                </PaginationItem>
                                <PaginationItem>
                                    <span className="text-sm font-medium">
                                        Page {currentPage + 1} of {pageCount}
                                    </span>
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationNext 
                                        onClick={() => setCurrentPage(prev => Math.min(pageCount - 1, prev + 1))}
                                        className={currentPage === pageCount - 1 ? "pointer-events-none opacity-50" : undefined}
                                    />
                                </PaginationItem>
                                <PaginationItem>
                                    <PaginationLast 
                                        onClick={() => setCurrentPage(pageCount - 1)}
                                        className={currentPage === pageCount - 1 ? "pointer-events-none opacity-50" : undefined}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </CardFooter>
                )}
            </Card>
        </TooltipProvider>
    )
}
