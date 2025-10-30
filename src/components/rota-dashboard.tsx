"use client";

import React from "react";
import { addDays, format, parseISO } from "date-fns";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { RotaTable } from "@/components/rota-table";
import { SwapShiftsDialog } from "@/components/swap-shifts-dialog";
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Download, Plus } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function RotaDashboard() {
  const { generationHistory, activeGenerationId, teamMembers, shifts } = useRotaStore();
  const { generateNewRota } = useRotaStoreActions();
  const { toast } = useToast();
  const [isSwapDialogOpen, setSwapDialogOpen] = React.useState(false);
  
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
  
  const handleCreateNext = () => {
    generateNewRota(true);
    toast({
      title: "Next Rota Created",
      description: "A new rota for the next 14-day period has been generated.",
    });
  };

  const startDate = activeGeneration?.startDate;
  const start = startDate ? parseISO(startDate) : new Date();
  const end = startDate ? addDays(start, 13) : new Date();

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
              <Button variant="outline" onClick={() => setSwapDialogOpen(true)}>
                <ArrowRightLeft />
                Swap Shifts
              </Button>
              <Button variant="outline" onClick={handleExport}><Download /> Export CSV</Button>
              <Button onClick={handleCreateNext}><Plus/> Create Next Rota</Button>
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
