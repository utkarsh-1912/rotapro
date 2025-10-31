
"use client";

import React from "react";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { Badge } from "../ui/badge";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, PaginationFirst, PaginationLast } from "../ui/pagination";
import { Recycle, Download, ArrowRightLeft, LifeBuoy } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Button } from "../ui/button";
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import type { RotaGeneration, Shift, TeamMember } from "@/lib/types";

function getSwapDetails(gen: RotaGeneration, shiftMap: Map<string, Shift>, memberMap: Map<string, TeamMember>) {
    if (!gen.manualSwaps || gen.manualSwaps.length === 0) {
        return null;
    }
    const swap = gen.manualSwaps[0]; // Assuming one swap per generation for now
    if (!swap) return null;

    const member1 = memberMap.get(swap.memberId1);
    const member2 = memberMap.get(swap.memberId2);
    if (!member1 || !member2) return null;

    // The shift recorded in assignments is their NEW shift, so the original shifts are swapped
    const member1OriginalShift = shiftMap.get(gen.assignments[swap.memberId2]);
    const member2OriginalShift = shiftMap.get(gen.assignments[swap.memberId1]);

    if (!member1OriginalShift || !member2OriginalShift) return null;

    const sequenceDiff = member2OriginalShift.sequence - member1OriginalShift.sequence;
    let netEffect: "neutral" | number = "neutral";
    if (sequenceDiff !== 0) {
        netEffect = sequenceDiff > 0 ? 1 : -1;
    }


    return {
        members: `${member1.name} & ${member2.name}`,
        shifts: `${member1OriginalShift.name} ↔ ${member2OriginalShift.name}`, // Show original shifts
        netEffect
    };
}


export function RotaMatrix() {
    const { generationHistory, shifts } = useRotaStore();
    const { swapShifts } = useRotaStoreActions();
    const [currentPage, setCurrentPage] = React.useState(0);
    const { toast } = useToast();
    const itemsPerPage = 5;

    const allHistoricalMembers = React.useMemo(() => {
        const memberMap = new Map<string, TeamMember>();
        generationHistory.forEach(gen => {
            if (gen.teamMembersAtGeneration) {
                gen.teamMembersAtGeneration.forEach(member => {
                    if (!memberMap.has(member.id)) {
                        memberMap.set(member.id, member);
                    }
                });
            }
        });
        return Array.from(memberMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [generationHistory]);
    
    const sortedHistory = React.useMemo(() =>
        [...generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()),
        [generationHistory]
    );

    const pageCount = Math.ceil(sortedHistory.length / itemsPerPage);
    const paginatedHistory = sortedHistory.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);
    const memberMap = React.useMemo(() => new Map(allHistoricalMembers.map(m => [m.id, m])), [allHistoricalMembers]);
    
    const swapHistory = React.useMemo(() => 
        sortedHistory
            .map(gen => ({ gen, details: getSwapDetails(gen, shiftMap, memberMap) }))
            .filter(item => item.details !== null),
        [sortedHistory, shiftMap, memberMap]
    );

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
            const endDate = parseISO(gen.endDate);
            return `${format(startDate, 'd MMM')} - ${format(endDate, 'd MMM yyyy')}`;
        })];

        const rows = allHistoricalMembers.map(member => {
            const memberRow = [member.name];
            sortedHistory.forEach(gen => {
                const shiftId = gen.assignments[member.id];
                const shift = shiftId ? shiftMap.get(shiftId) : null;
                const wasMemberInTeam = gen.teamMembersAtGeneration?.some(m => m.id === member.id) ?? false;

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

    const findAndHandleSwapBack = (swapGenId: string, memberId1: string, memberId2: string) => {
        const originalSwapGen = generationHistory.find(g => g.id === swapGenId);
        if (!originalSwapGen) return;

        const originalShiftForM1 = originalSwapGen.assignments[memberId2]; // Original shift for M1 was what M2 got
        const originalShiftForM2 = originalSwapGen.assignments[memberId1];

        const futureGens = generationHistory.filter(g => parseISO(g.startDate) >= parseISO(originalSwapGen.startDate));

        for (const futureGen of futureGens) {
            if (futureGen.assignments[memberId1] === originalShiftForM2 && futureGen.assignments[memberId2] === originalShiftForM1) {
                // Found a swap back opportunity
                swapShifts(memberId1, memberId2, futureGen.id);
                 toast({
                    title: "Swap Back Executed",
                    description: `Shifts for rota period starting ${format(parseISO(futureGen.startDate), 'd MMM yyyy')} have been swapped back.`,
                });
                return;
            }
        }

        toast({
            variant: "destructive",
            title: "No Swap Back Found",
            description: "No future rota was found where a direct swap-back was possible.",
        });
    }
    
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
                                        const endDate = parseISO(gen.endDate);
                                        return (
                                            <TableHead key={gen.id} className="text-center font-semibold whitespace-nowrap">
                                                {format(startDate, 'd')} - {format(endDate, 'd MMM yyyy')}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {allHistoricalMembers.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium sticky left-0 bg-card z-10">{member.name}</TableCell>
                                        {paginatedHistory.map(gen => {
                                            const assignmentId = gen.assignments[member.id];
                                            const shift = assignmentId ? shiftMap.get(assignmentId) : null;
                                            const isManuallyChanged = gen.manualOverrides?.includes(member.id);
                                            const isSwapped = gen.manualSwaps?.some(s => s.memberId1 === member.id || s.memberId2 === member.id);
                                            
                                            const wasMemberInTeam = gen.teamMembersAtGeneration?.some(m => m.id === member.id) ?? false;

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
                                                            {isManuallyChanged && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="ml-1.5 inline-block">
                                                                            {isSwapped 
                                                                                ? <ArrowRightLeft className="h-3 w-3" />
                                                                                : <Recycle className="h-3 w-3" />
                                                                            }
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>
                                                                            {isSwapped ? "Shift was manually swapped" : "Shift was manually edited"}
                                                                        </p>
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
                                {allHistoricalMembers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={paginatedHistory.length + 1} className="text-center text-muted-foreground h-24">
                                            No team members found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    {sortedHistory.length === 0 && allHistoricalMembers.length > 0 && (
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

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><LifeBuoy /> Ad-hoc Support Matrix</CardTitle>
                    <CardDescription>
                        Historical view of ad-hoc support assignments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="font-semibold sticky left-0 bg-card z-10">Member</TableHead>
                                     {paginatedHistory.map(gen => {
                                        const startDate = parseISO(gen.startDate);
                                        const endDate = parseISO(gen.endDate);
                                        return (
                                            <TableHead key={gen.id} className="text-center font-semibold whitespace-nowrap">
                                                {format(startDate, 'd')} - {format(endDate, 'd MMM yyyy')}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                 {allHistoricalMembers.map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium sticky left-0 bg-card z-10">{member.name}</TableCell>
                                        {paginatedHistory.map(gen => {
                                            const adhocAssignments = gen.adhoc || {};
                                            const memberAdhoc = adhocAssignments[member.id];
                                            const wasOnAdhoc = memberAdhoc && Object.values(memberAdhoc).some(v => v);

                                            return (
                                                <TableCell key={gen.id} className="text-center text-xs">
                                                   {wasOnAdhoc ? <Badge>On Duty</Badge> : <span className="text-muted-foreground">-</span>}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))}
                                {allHistoricalMembers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={paginatedHistory.length + 1} className="text-center text-muted-foreground h-24">
                                            No team members found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

             {swapHistory.length > 0 && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Manual Swap History</CardTitle>
                        <CardDescription>
                            A log of all manual shift swaps that have occurred.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <div className="overflow-x-auto rounded-lg border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rota Period</TableHead>
                                        <TableHead>Members Involved</TableHead>
                                        <TableHead>Shifts Swapped</TableHead>
                                        <TableHead>Net Effect</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {swapHistory.map(({ gen, details }) => {
                                        const startDate = parseISO(gen.startDate);
                                        const endDate = parseISO(gen.endDate);
                                        const member1Id = gen.manualSwaps![0].memberId1;
                                        const member2Id = gen.manualSwaps![0].memberId2;
                                        return (
                                            <TableRow key={gen.id}>
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {format(startDate, 'd MMM')} - {format(endDate, 'd MMM yyyy')}
                                                </TableCell>
                                                <TableCell>{details?.members}</TableCell>
                                                <TableCell>{details?.shifts}</TableCell>
                                                <TableCell>
                                                    {details?.netEffect !== 'neutral' && (
                                                        <Badge variant={details?.netEffect === 1 ? "default" : "destructive"}>
                                                            {details?.netEffect === 1 ? '+1' : '-1'}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => findAndHandleSwapBack(gen.id, member1Id, member2Id)}
                                                            >
                                                                <Recycle className="h-4 w-4 mr-2" />
                                                                Cancel Out
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Find a future rota where these members can be swapped back to cancel the net effect.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </TooltipProvider>
    )
}
