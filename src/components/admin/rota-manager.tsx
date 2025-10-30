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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';

export function RotaGenerationDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const { generationHistory, generateNewRota } = useRotaStore();
    const [date, setDate] = React.useState<Date | undefined>();
    const [rotaPeriodWeeks, setRotaPeriodWeeks] = React.useState("2");
    const { toast } = useToast();

    const handleGenerate = () => {
        if (date) {
            const periodInDays = parseInt(rotaPeriodWeeks) * 7;
            const newInterval = { start: date, end: addDays(date, periodInDays - 1) };
            
            const overlappingGeneration = generationHistory.find(gen => 
                areIntervalsOverlapping(
                    newInterval,
                    { start: new Date(gen.startDate), end: new Date(gen.endDate) }
                )
            );

            if (overlappingGeneration) {
                toast({
                    variant: "destructive",
                    title: "Generation Failed",
                    description: `The selected date range overlaps with an existing rota from ${format(new Date(overlappingGeneration.startDate), 'PPP')} to ${format(new Date(overlappingGeneration.endDate), 'PPP')}.`,
                });
                return;
            }

            generateNewRota(date, parseInt(rotaPeriodWeeks));
            toast({
                title: "New Rota Generated",
                description: `A new ${rotaPeriodWeeks}-week rota starting on ${format(date, 'PPP')} has been generated.`,
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
                const lastEndDate = parseISO(latestGeneration.endDate);
                const nextStartDate = addDays(lastEndDate, 1);
                setDate(startOfWeek(nextStartDate, { weekStartsOn: 1 }));
            } else {
                let nextMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
                if (isPast(nextMonday)) {
                  nextMonday = addDays(nextMonday, 7);
                }
                setDate(nextMonday);
            }
            setRotaPeriodWeeks("2"); // Reset to default when opening
        }
    }, [open, generationHistory]);

    return (
        <>
            <div className="grid gap-4 py-4">
                <p className="text-sm text-muted-foreground">
                    Select a start date (must be a Monday) and the desired duration for the new rota.
                </p>
                <div className='space-y-2'>
                    <Label htmlFor="start-date">Start Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="start-date"
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

                <div className="space-y-2">
                    <Label htmlFor="rota-period">Rota Period</Label>
                    <Select value={rotaPeriodWeeks} onValueChange={setRotaPeriodWeeks}>
                        <SelectTrigger id="rota-period">
                            <SelectValue placeholder="Select period" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1 Week</SelectItem>
                            <SelectItem value="2">2 Weeks</SelectItem>
                            <SelectItem value="4">4 Weeks</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
