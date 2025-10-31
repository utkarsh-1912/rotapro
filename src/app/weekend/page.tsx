
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
import {
  format,
  parseISO,
  eachWeekendOfInterval,
  isWithinInterval,
  isSaturday,
  addDays,
} from "date-fns";
import { Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WeekendRotaPage() {
  const { weekendRotas, teamMembers, generationHistory, activeGenerationId } =
    useRotaStore();
  const { generateWeekendRota, deleteWeekendRotaForPeriod } =
    useRotaStoreActions();
  const [selectedGenerationId, setSelectedGenerationId] =
    React.useState<string | null>(activeGenerationId);

  const selectedGeneration = React.useMemo(
    () => generationHistory.find((g) => g.id === selectedGenerationId),
    [generationHistory, selectedGenerationId]
  );

  const memberMap = React.useMemo(
    () => new Map(teamMembers.map((m) => [m.id, m])),
    [teamMembers]
  );
  
  const sortedHistory = React.useMemo(() =>
    [...generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()),
    [generationHistory]
  );

  const weekendsForPeriod = React.useMemo(() => {
    if (!selectedGeneration) return [];
    const allWeekends = eachWeekendOfInterval({
      start: parseISO(selectedGeneration.startDate),
      end: parseISO(selectedGeneration.endDate),
    });
    return allWeekends.filter(day => isSaturday(day));
  }, [selectedGeneration]);

  const rotaForPeriod = React.useMemo(() => {
    if (!selectedGeneration) return null;
    const periodRotas = weekendRotas.filter(rota => {
        const rotaDate = parseISO(rota.date);
        return isWithinInterval(rotaDate, {
            start: parseISO(selectedGeneration.startDate),
            end: parseISO(selectedGeneration.endDate),
        });
    });
    // Check if a rota has actually been generated for these weekends
    if (periodRotas.length === weekendsForPeriod.length && weekendsForPeriod.length > 0) {
        return periodRotas.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }
    return null;
  }, [weekendRotas, selectedGeneration, weekendsForPeriod]);


  React.useEffect(() => {
    // When the active rota changes elsewhere, update the selection here
    if (activeGenerationId && !selectedGenerationId) {
        setSelectedGenerationId(activeGenerationId);
    }
  }, [activeGenerationId, selectedGenerationId]);

  return (
    <Card className="m-4 sm:m-6">
      <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Weekend Rota</CardTitle>
          <CardDescription>
            Generate and view the sequential rota for weekend duties for a selected rota period.
          </CardDescription>
          <div className="pt-4">
              <Select value={selectedGenerationId || ""} onValueChange={setSelectedGenerationId}>
                  <SelectTrigger className="w-full sm:w-[280px]">
                      <SelectValue placeholder="Select a rota period" />
                  </SelectTrigger>
                  <SelectContent>
                      {sortedHistory.map(gen => (
                          <SelectItem key={gen.id} value={gen.id}>
                              {format(parseISO(gen.startDate), 'd MMM')} - {format(parseISO(gen.endDate), 'd MMM yyyy')}
                          </SelectItem>
                      ))}
                  </SelectContent>
              </Select>
            </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedGeneration ? (
          rotaForPeriod ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Weekend</TableHead>
                    <TableHead>Assigned Member</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rotaForPeriod.map((rota) => (
                    <TableRow key={rota.date}>
                      <TableCell className="font-medium">
                        {format(parseISO(rota.date), "d MMM")} - {format(addDays(parseISO(rota.date), 1), "d MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        {memberMap.get(rota.memberId)?.name || "Unknown Member"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              <p>
                No weekend rota generated for this period.
              </p>
              <Button
                className="mt-4"
                onClick={() => generateWeekendRota(selectedGeneration.id)}
                disabled={weekendsForPeriod.length === 0}
              >
                Generate Rota
              </Button>
            </div>
          )
        ) : (
             <div className="text-center text-muted-foreground py-12">
                <p>Select a rota period to manage the weekend rota.</p>
            </div>
        )}
      </CardContent>
      {selectedGeneration && rotaForPeriod && (
        <CardFooter className="flex justify-end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2" />
                Delete Weekend Rota for this Period
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will delete the weekend rota for the selected period. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    deleteWeekendRotaForPeriod(selectedGeneration.id)
                  }
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      )}
    </Card>
  );
}
