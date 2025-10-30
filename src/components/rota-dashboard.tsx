"use client";

import React from "react";
import { motion } from "framer-motion";
import { addDays, format, parseISO } from "date-fns";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { RotaTable } from "@/components/rota-table";
import { SwapShiftsDialog } from "@/components/swap-shifts-dialog";
import { downloadCsv } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ArrowRightLeft, Copy, Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "./ui/skeleton";

export function RotaDashboard() {
  const { rota, teamMembers, shifts, startDate } = useRotaStore((state) => ({
    rota: state.rota,
    teamMembers: state.teamMembers,
    shifts: state.shifts,
    startDate: state.startDate,
  }));
  const { cloneRota } = useRotaStoreActions();
  const { toast } = useToast();
  const [isSwapDialogOpen, setSwapDialogOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);
  React.useEffect(() => setIsMounted(true), []);

  const handleExport = () => {
    if (!startDate) return;
    const csvData: (string | number)[][] = [];
    const headers = ["Date", ...teamMembers.map((m) => m.name)];
    csvData.push(headers);

    const shiftMap = new Map(shifts.map(s => [s.id, s.name]));

    for (let i = 0; i < 14; i++) {
      const date = addDays(parseISO(startDate), i);
      const dateString = format(date, "yyyy-MM-dd");
      const row = [format(date, "EEE, MMM d")];
      teamMembers.forEach((member) => {
        const shiftId = rota[dateString]?.[member.id];
        row.push(shiftId ? shiftMap.get(shiftId) || "Unknown" : "Off");
      });
      csvData.push(row);
    }
    
    downloadCsv(csvData, `rota-${format(parseISO(startDate), "yyyy-MM-dd")}.csv`);
    toast({
      title: "Export Successful",
      description: "Your rota has been downloaded as a CSV file.",
    });
  };
  
  const handleClone = () => {
    cloneRota();
     toast({
      title: "Next Rota Created",
      description: "The rota for the next 14-day period has been created.",
    });
  };

  const start = isMounted && startDate ? parseISO(startDate) : new Date();
  const end = isMounted && startDate ? addDays(start, 13) : new Date();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Current Rota</h1>
            {isMounted && startDate ? (
              <p className="text-muted-foreground">
                  Showing shifts for {format(start, 'd MMM')} - {format(end, 'd MMM yyyy')}
              </p>
            ) : (
              <Skeleton className="h-5 w-80 mt-1" />
            )}
        </div>
        <div className="flex gap-2 flex-wrap">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline"><Copy /> Create Next Rota</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Create Rota for Next Period?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will create the next 14-day rota by rotating team members from the current period.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClone}>Continue</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          <Button variant="outline" onClick={() => setSwapDialogOpen(true)}>
            <ArrowRightLeft />
            Swap Shifts
          </Button>
          <Button onClick={handleExport}><Download /> Export CSV</Button>
        </div>
      </div>
      
      <RotaTable />

      <SwapShiftsDialog open={isSwapDialogOpen} onOpenChange={setSwapDialogOpen} />
    </motion.div>
  );
}
