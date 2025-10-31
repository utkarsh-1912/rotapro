"use client";

import * as React from "react";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  format,
  isWeekend,
  eachWeekendOfInterval,
  startOfMonth,
  endOfMonth,
  addMonths,
} from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

export function WeekendRotaManager() {
  const { weekendRotas, teamMembers } = useRotaStore();
  const { generateWeekendRota, deleteWeekendRota } = useRotaStoreActions();
  const [currentMonth, setCurrentMonth] = React.useState(new Date());

  const handleGenerate = (month: Date) => {
    const interval = {
      start: startOfMonth(month),
      end: endOfMonth(month),
    };
    generateWeekendRota(interval);
  };
  
  const memberMap = React.useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  const monthlyRotas = React.useMemo(() => {
    return weekendRotas.filter(rota => {
        const rotaDate = new Date(rota.date);
        return rotaDate.getMonth() === currentMonth.getMonth() && rotaDate.getFullYear() === currentMonth.getFullYear();
    }).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [weekendRotas, currentMonth]);

  const hasRotaForMonth = monthlyRotas.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Weekend Rota</CardTitle>
          <CardDescription>
            Generate and view the sequential rota for weekend duties.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
                <ChevronLeft/>
            </Button>
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-48">
                        <CalendarIcon className="mr-2"/>
                        {format(currentMonth, "MMMM yyyy")}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={currentMonth}
                        onSelect={(date) => date && setCurrentMonth(date)}
                        initialFocus
                        pagedNavigation
                    />
                </PopoverContent>
            </Popover>
             <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight/>
            </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hasRotaForMonth ? (
           <div className="overflow-x-auto rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Weekend Date</TableHead>
                            <TableHead>Assigned Member</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {monthlyRotas.map(rota => (
                            <TableRow key={rota.date}>
                                <TableCell className="font-medium">{format(new Date(rota.date), "EEE, d MMM yyyy")}</TableCell>
                                <TableCell>{memberMap.get(rota.memberId)?.name || 'Unknown Member'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ) : (
            <div className="text-center text-muted-foreground py-12">
                <p>No weekend rota generated for {format(currentMonth, "MMMM yyyy")}.</p>
                <Button className="mt-4" onClick={() => handleGenerate(currentMonth)}>Generate Rota</Button>
            </div>
        )}
      </CardContent>
       {hasRotaForMonth && (
        <CardFooter className="flex justify-end">
             <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2"/>
                        Delete Rota for {format(currentMonth, "MMMM")}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the weekend rota for {format(currentMonth, "MMMM yyyy")}. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteWeekendRota(currentMonth)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CardFooter>
       )}
    </Card>
  );
}
