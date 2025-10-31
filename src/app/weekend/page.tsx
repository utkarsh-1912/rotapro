
"use client";

import * as React from "react";
import { useRotaStore } from "@/lib/store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRightLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SwapWeekendDialog } from "@/components/swap-weekend-dialog";

export default function WeekendRotaPage() {
  const { weekendRotas, teamMembers, generationHistory, activeGenerationId } =
    useRotaStore();
  const [selectedGenerationId, setSelectedGenerationId] =
    React.useState<string | null>(activeGenerationId);
  const [isSwapDialogOpen, setSwapDialogOpen] = React.useState(false);

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

  const rotaForPeriod = React.useMemo(() => {
    if (!selectedGeneration) return null;
    const periodRotas = weekendRotas.filter(rota => rota.generationId === selectedGeneration.id);
    
    if (periodRotas.length > 0) {
        return periodRotas.sort((a,b) => parseISO(a.date).getTime() - parseISO(b.date).getTime());
    }
    return null;
  }, [weekendRotas, selectedGeneration]);


  React.useEffect(() => {
    // When the active rota changes elsewhere, update the selection here
    if (activeGenerationId && !selectedGenerationId) {
        setSelectedGenerationId(activeGenerationId);
    }
  }, [activeGenerationId, selectedGenerationId]);

  return (
    <>
    <Card className="m-4 sm:m-6">
      <CardHeader className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Weekend Rota</CardTitle>
          <CardDescription>
            View the sequential rota for weekend duties for a selected rota period.
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
        <Button variant="outline" onClick={() => setSwapDialogOpen(true)} disabled={!rotaForPeriod}>
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Swap Weekend
        </Button>
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
            <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
              <CalendarDays className="h-10 w-10 text-muted-foreground" />
              <p>
                No weekend rota generated for this period.
              </p>
            </div>
          )
        ) : (
             <div className="text-center text-muted-foreground py-12 flex flex-col items-center gap-4">
                <CalendarDays className="h-10 w-10 text-muted-foreground" />
                <p>Select a rota period to view the weekend rota.</p>
            </div>
        )}
      </CardContent>
    </Card>
    {selectedGeneration && (
        <SwapWeekendDialog
            open={isSwapDialogOpen}
            onOpenChange={setSwapDialogOpen}
            generationId={selectedGeneration.id}
        />
    )}
    </>
  );
}
