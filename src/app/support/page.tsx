
"use client";

import React from "react";
import { useRotaStore } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import { startOfWeek, endOfWeek, addDays, format, parseISO } from "date-fns";
import { LifeBuoy, Download, FileText, Image as ImageIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toPng } from 'html-to-image';
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { SupportRotaExportImage } from "@/components/support-rota-export-image";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";


type AdhocStatus = Record<string, Record<number, boolean>>;
type AdhocNotes = Record<string, string>;

export default function SupportRotaPage() {
  const { generationHistory, activeGenerationId, shifts, teamMembers } = useRotaStore();
  const [adhocStatus, setAdhocStatus] = React.useState<AdhocStatus>({});
  const [adhocNotes, setAdhocNotes] = React.useState<AdhocNotes>({});
  const [isExportDialogOpen, setExportDialogOpen] = React.useState(false);
  const { toast } = useToast();
  const exportImageRef = React.useRef<HTMLDivElement>(null);


  const activeGeneration = React.useMemo(() =>
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);
  
  const handleAdhocChange = (memberId: string, weekIndex: number) => {
    setAdhocStatus(prev => ({
        ...prev,
        [memberId]: {
            ...(prev[memberId] || {}),
            [weekIndex]: !prev[memberId]?.[weekIndex]
        }
    }));
  };

  const handleNoteChange = (memberId: string, note: string) => {
    setAdhocNotes(prev => ({ ...prev, [memberId]: note }));
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

  const handleExport = async (formatType: 'csv' | 'png') => {
    if (!activeGeneration) return;

    const startDate = parseISO(activeGeneration.startDate);
    const filename = `support-rota-${format(startDate, "yyyy-MM-dd")}`;

    if (formatType === 'csv') {
        const headers = ["Team Member", "Main Shift", "Ad-hoc Note"];
        weeks.forEach((week, index) => {
          headers.push(`On Ad-hoc (Week ${index + 1} - ${format(week.start, 'd MMM')})`);
        });

        const rows = teamMembersInRota.map(member => {
            const shiftId = activeGeneration.assignments[member.id];
            const shift = shiftId ? shiftMap.get(shiftId) : null;
            const row: (string | boolean)[] = [member.name, shift ? shift.name : "Off", adhocNotes[member.id] || ""];

            weeks.forEach((_, weekIndex) => {
                const isOnAdhoc = !!adhocStatus[member.id]?.[weekIndex];
                row.push(isOnAdhoc);
            });
            return row;
        });
        
        downloadCsv([headers, ...rows], `${filename}.csv`);
        toast({
            title: "Export Successful",
            description: "Your support rota has been downloaded as a CSV file.",
        });
    } else if (formatType === 'png') {
        if (exportImageRef.current) {
            try {
                const fontCssResponse = await fetch(
                    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
                );
                const fontCss = await fontCssResponse.text();

                const dataUrl = await toPng(exportImageRef.current, { 
                    cacheBust: true, 
                    pixelRatio: 2,
                    fontEmbedCSS: fontCss,
                    backgroundColor: 'white',
                });
                
                const link = document.createElement('a');
                link.download = `${filename}.png`;
                link.href = dataUrl;
                link.click();
                toast({
                    title: "Export Successful",
                    description: "Your support rota has been downloaded as a PNG image.",
                });
            } catch (err) {
                console.error(err);
                toast({
                    variant: "destructive",
                    title: "Export Failed",
                    description: "Could not generate image.",
                });
            }
        }
    }

    setExportDialogOpen(false);
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Ad-hoc Support Planning</CardTitle>
            <CardDescription>
              Assign team members to ad-hoc support duty for each week of the active rota period.
            </CardDescription>
          </div>
           <Dialog open={isExportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" disabled={!activeGeneration}><Download /> Export</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Support Rota</DialogTitle>
                <DialogDescription>Choose the format to export your ad-hoc support rota.</DialogDescription>
              </DialogHeader>
              <div className="flex justify-center gap-4 py-4">
                <Button variant="outline" onClick={() => handleExport('csv')} className="flex-1">
                    <FileText className="mr-2 h-4 w-4" />
                    Export as CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('png')} className="flex-1">
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Export as Image
                </Button>
              </div>
                <div className="absolute -left-[9999px] top-0">
                    <SupportRotaExportImage 
                        ref={exportImageRef} 
                        activeGeneration={activeGeneration}
                        teamMembersInRota={teamMembersInRota}
                        weeks={weeks}
                        adhocStatus={adhocStatus}
                        adhocNotes={adhocNotes}
                    />
                </div>
            </DialogContent>
          </Dialog>
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
                        <TableCell className="font-medium sticky left-0 bg-card z-10 whitespace-nowrap">
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
                           <Textarea 
                             placeholder="Log any adhoc queries here..." 
                             className="text-xs" 
                             rows={1}
                             value={adhocNotes[member.id] || ""}
                             onChange={(e) => handleNoteChange(member.id, e.target.value)}
                           />
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
