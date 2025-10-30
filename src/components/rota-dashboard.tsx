"use client";

import React from "react";
import { addDays, format, parseISO } from "date-fns";
import { useRotaStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { RotaTable } from "@/components/rota-table";
import { SwapShiftsDialog } from "@/components/swap-shifts-dialog";
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Download, Plus } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { RotaGenerationDialog } from "./admin/rota-manager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";

export function RotaDashboard() {
  const { generationHistory, activeGenerationId, teamMembers, shifts } = useRotaStore();
  const { toast } = useToast();
  const [isSwapDialogOpen, setSwapDialogOpen] = React.useState(false);
  const [isGenerateDialogOpen, setGenerateDialogOpen] = React.useState(false);
  
  const activeGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const handleExport = () => {
    if (!activeGeneration) return;

    const { assignments, startDate } = activeGeneration;
    const csvData: (string | number)[][] = [
      ["Member", "Shift"]
    ];

    const shiftMap = new Map(shifts.map(s => [s.id, s.name]));

    teamMembers.forEach((member) => {
      const shiftId = assignments[member.id];
      const shiftName = shiftId ? shiftMap.get(shiftId) || "Off" : "Off";
      csvData.push([member.name, shiftName]);
    });
    
    downloadCsv(csvData, `rota-${format(parseISO(startDate), "yyyy-MM-dd")}.csv`);
    toast({
      title: "Export Successful",
      description: "Your rota has been downloaded as a CSV file.",
    });
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
              <Button variant="outline" onClick={handleExport} disabled={!activeGeneration}><Download /> Export CSV</Button>
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
        <RotaTable />
        <SwapShiftsDialog open={isSwapDialogOpen} onOpenChange={setSwapDialogOpen} />
      </CardContent>
    </Card>
  );
}
