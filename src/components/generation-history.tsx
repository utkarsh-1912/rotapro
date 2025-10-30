"use client";

import React from "react";
import { format, parseISO, addDays } from "date-fns";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, CheckCircle } from "lucide-react";
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
import { cn } from "@/lib/utils";

export function GenerationHistory() {
    const { generationHistory, activeGenerationId } = useRotaStore();
    const { deleteGeneration, setActiveGenerationId } = useRotaStoreActions();

    const sortedHistory = React.useMemo(() => 
        [...generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime()),
        [generationHistory]
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Generation History</CardTitle>
                <CardDescription>View and manage previously generated rotas. Click one to view it.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-64">
                    <div className="flex flex-col gap-2 pr-4">
                        {sortedHistory.length > 0 ? sortedHistory.map((gen) => {
                            const isActive = gen.id === activeGenerationId;
                            const startDate = parseISO(gen.startDate);
                            const endDate = addDays(startDate, 13);
                            return (
                                <div
                                    key={gen.id}
                                    onClick={() => setActiveGenerationId(gen.id)}
                                    className={cn(
                                        "flex items-center justify-between rounded-lg border p-3 transition-colors cursor-pointer",
                                        isActive ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {isActive && <CheckCircle className="h-5 w-5 text-primary" />}
                                        <div>
                                            <div className="font-semibold">
                                                Rota for {format(startDate, 'd MMM')} - {format(endDate, 'd MMM yyyy')}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Generated on: {format(new Date(parseInt(gen.id)), 'PPpp')}
                                            </div>
                                        </div>
                                    </div>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" onClick={e => e.stopPropagation()}>
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete Rota</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                   This action cannot be undone. This will permanently delete this rota generation.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction onClick={() => deleteGeneration(gen.id)}>
                                                    Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                            )
                        }) : (
                            <div className="text-center text-muted-foreground py-10">
                                No generation history found.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    )
}
