import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, startOfWeek, addDays, areIntervalsOverlapping, parseISO, isPast } from 'date-fns';
import { useRotaStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { isMonday } from 'date-fns';

export function RotaGenerationDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { generationHistory, generateNewRota } = useRotaStore();
    const [date, setDate] = React.useState<Date | undefined>();
    const { toast } = useToast();

    const handleGenerate = () => {
        if (date) {
            const newInterval = { start: date, end: addDays(date, 13) };
            const overlappingGeneration = generationHistory.find(gen => 
                areIntervalsOverlapping(
                    newInterval,
                    { start: new Date(gen.startDate), end: addDays(new Date(gen.startDate), 13) }
                )
            );

            if (overlappingGeneration) {
                toast({
                    variant: "destructive",
                    title: "Generation Failed",
                    description: `The selected date range overlaps with an existing rota starting on ${format(new Date(overlappingGeneration.startDate), 'PPP')}.`,
                });
                return;
            }

            generateNewRota(date);
            toast({
                title: "New Rota Generated",
                description: `A new rota starting on ${format(date, 'PPP')} has been generated.`,
            });
            onOpenChange(false);
        } else {
             toast({
                variant: "destructive",
                title: "Generation Failed",
                description: "Please select a start date.",
            });
        }
    };
    
    React.useEffect(() => {
        if (open) {
            if (generationHistory.length > 0) {
                const latestGeneration = [...generationHistory].sort((a, b) => parseISO(b.startDate).getTime() - parseISO(a.startDate).getTime())[0];
                const lastStartDate = parseISO(latestGeneration.startDate);
                const nextStartDate = addDays(lastStartDate, 14);
                setDate(startOfWeek(nextStartDate, { weekStartsOn: 1 }));
            } else {
                let nextMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
                if (isPast(nextMonday)) {
                  nextMonday = addDays(nextMonday, 7);
                }
                setDate(nextMonday);
            }
        }
    }, [open, generationHistory]);

    return (
        <>
            <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                    Select a Monday to generate a new rota for that week. This will become the active rota.
                </p>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant={"outline"}
                            className={cn(
                                "w-full justify-start text-left font-normal",
                                !date && "text-muted-foreground"
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {date ? format(date, "PPP") : <span>Pick a date</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(day) => !isMonday(day)}
                            initialFocus
                        />
                    </PopoverContent>
                </Popover>
            </div>
            <div className="flex justify-end gap-2">
                 <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button onClick={handleGenerate}>Generate</Button>
            </div>
        </>
    )
}
