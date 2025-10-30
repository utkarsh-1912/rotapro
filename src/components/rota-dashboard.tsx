"use client";

import React from "react";
import { addDays, format, parseISO } from "date-fns";
import { useRotaStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { RotaTable } from "@/components/rota-table";
import { SwapShiftsDialog } from "@/components/swap-shifts-dialog";
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Download, Plus, FileText, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { RotaGenerationDialog } from "./admin/rota-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "./ui/dialog";
import { toPng } from 'html-to-image';

export function RotaDashboard() {
  const { generationHistory, activeGenerationId, teamMembers, shifts } = useRotaStore();
  const { toast } = useToast();
  const [isSwapDialogOpen, setSwapDialogOpen] = React.useState(false);
  const [isGenerateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  const [isExportDialogOpen, setExportDialogOpen] = React.useState(false);
  
  const activeGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const rotaTableRef = React.useRef<HTMLDivElement>(null);

  const handleExport = (formatType: 'csv' | 'png') => {
    if (!activeGeneration) return;

    const startDate = parseISO(activeGeneration.startDate);
    const filename = `rota-${format(startDate, "yyyy-MM-dd")}`;

    if (formatType === 'csv') {
        const csvData: (string | number)[][] = [
            ["Member", "Shift", "Start Time", "End Time"]
        ];

        const shiftMap = new Map(shifts.map(s => [s.id, s]));

        teamMembers.forEach((member) => {
            const shiftId = activeGeneration.assignments[member.id];
            const shift = shiftId ? shiftMap.get(shiftId) : null;
            const shiftName = shift ? shift.name : "Off";
            const startTime = shift ? shift.startTime : "";
            const endTime = shift ? shift.endTime : "";
            csvData.push([member.name, shiftName, startTime, endTime]);
        });
        
        downloadCsv(csvData, `${filename}.csv`);
        toast({
            title: "Export Successful",
            description: "Your rota has been downloaded as a CSV file.",
        });
    } else if (formatType === 'png') {
        if (rotaTableRef.current) {
            toPng(rotaTableRef.current, { cacheBust: true, pixelRatio: 2 })
                .then((dataUrl) => {
                    const link = document.createElement('a');
                    link.download = `${filename}.png`;
                    link.href = dataUrl;
                    link.click();
                    toast({
                        title: "Export Successful",
                        description: "Your rota has been downloaded as a PNG image.",
                    });
                })
                .catch((err) => {
                    console.error(err);
                    toast({
                        variant: "destructive",
                        title: "Export Failed",
                        description: "Could not generate image.",
                    });
                });
        }
    }

    setExportDialogOpen(false);
  };

  const startDate = activeGeneration?.startDate;
  const start = startDate ? parseISO(startDate) : new Date();
  const end = startDate ? addDays(start, 4) : new Date();

  return (
    <Card>
       <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle>Active Rota</CardTitle>
                 {startDate ? (
                  <CardDescription className="mt-1">
                      Showing shifts for {format(start, 'd MMM')} - {format(end, 'd MMM yyyy')}
                  </CardDescription>
                ) : (
                  <Skeleton className="h-5 w-80 mt-1" />
                )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={() => setSwapDialogOpen(true)} disabled={!activeGeneration}>
                <ArrowRightLeft />
                Swap Shifts
              </Button>
               <Dialog open={isExportDialogOpen} onOpenChange={setExportDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" disabled={!activeGeneration}><Download /> Export</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Export Rota</DialogTitle>
                    <DialogDescription>Choose the format to export your rota.</DialogDescription>
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
                </DialogContent>
              </Dialog>
              <Dialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen}>
                <DialogTrigger asChild>
                  <Button><Plus/> Generate Rota</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Generate New Rota</DialogTitle>
                  </DialogHeader>
                  <RotaGenerationDialog open={isGenerateDialogOpen} onOpenChange={setGenerateDialogOpen} />
                </DialogContent>
              </Dialog>
            </div>
          </div>
       </CardHeader>
      <CardContent>
        <RotaTable ref={rotaTableRef} />
        <SwapShiftsDialog open={isSwapDialogOpen} onOpenChange={setSwapDialogOpen} />
      </CardContent>
    </Card>
  );
}