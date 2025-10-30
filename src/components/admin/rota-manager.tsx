import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format, startOfWeek } from 'date-fns';
import { useRotaStoreActions } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { isMonday } from 'date-fns';

export function RotaGenerationDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (open: boolean) => void }) {
    const [date, setDate] = React.useState<Date | undefined>(startOfWeek(new Date(), { weekStartsOn: 1 }));
    const { generateNewRota } = useRotaStoreActions();
    const { toast } = useToast();

    const handleGenerate = () => {
        if (date) {
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
            setDate(startOfWeek(new Date(), { weekStartsOn: 1 }));
        }
    }, [open]);

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
