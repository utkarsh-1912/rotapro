
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Shift, TeamMember } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";

const editAssignmentSchema = z.object({
  shiftId: z.string().min(1, "A shift must be selected."),
});

type EditAssignmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: TeamMember;
  currentShiftId?: string;
};

export function EditAssignmentDialog({ open, onOpenChange, member, currentShiftId }: EditAssignmentDialogProps) {
  const { shifts, generationHistory, activeGenerationId } = useRotaStore();
  const { updateAssignment } = useRotaStoreActions();
  const { toast } = useToast();
  const [warnings, setWarnings] = React.useState<string[]>([]);
  
  const form = useForm<z.infer<typeof editAssignmentSchema>>({
    resolver: zodResolver(editAssignmentSchema),
  });

  const activeGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === activeGenerationId)
  , [generationHistory, activeGenerationId]);

  const sortedShifts = React.useMemo(() => 
    [...shifts].sort((a,b) => a.sequence - b.sequence), 
  [shifts]);

  const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);

  const checkWarnings = (newShiftId: string) => {
    if (!member || !activeGeneration) return;

    const newWarnings: string[] = [];
    const newShift = shiftMap.get(newShiftId);
    if (!newShift) return;

    // Check for extreme shift transition
    const lastGenIndex = generationHistory.findIndex(g => g.id === activeGenerationId) -1;
    if (lastGenIndex >= 0) {
        const lastGeneration = generationHistory[lastGenIndex];
        const lastShiftId = lastGeneration.assignments[member.id];
        const lastShift = lastShiftId ? shiftMap.get(lastShiftId) : undefined;
        if(lastShift?.isExtreme && newShift.isExtreme) {
            newWarnings.push(`Transitioning from an extreme shift (${lastShift.name}) to another (${newShift.name}).`);
        }
    }
    
    // Check min/max team constraints
    const newAssignments = { ...activeGeneration.assignments };
    newAssignments[member.id] = newShiftId;
    const oldShift = shiftMap.get(currentShiftId!);
    
    const newShiftCount = Object.values(newAssignments).filter(id => id === newShiftId).length;
    if (newShiftCount > newShift.maxTeam) {
        newWarnings.push(`"${newShift.name}" shift will be over capacity (max: ${newShift.maxTeam}).`);
    }
    if (oldShift) {
        const oldShiftCount = Object.values(newAssignments).filter(id => id === oldShift.id).length;
        if (oldShiftCount < oldShift.minTeam) {
            newWarnings.push(`"${oldShift.name}" shift will be under capacity (min: ${oldShift.minTeam}).`);
        }
    }

    setWarnings(newWarnings);
  };


  function onSubmit(values: z.infer<typeof editAssignmentSchema>) {
    if (!member) return;
    
    updateAssignment(member.id, values.shiftId);
    toast({
      title: "Assignment Updated",
      description: `${member.name}'s shift has been changed.`,
    });
    onOpenChange(false);
  }
  
  React.useEffect(() => {
    if (open && currentShiftId) {
      form.setValue("shiftId", currentShiftId);
      setWarnings([]);
    } else {
      form.reset();
      setWarnings([]);
    }
  }, [open, currentShiftId, form]);

  const handleShiftChange = (shiftId: string) => {
    form.setValue("shiftId", shiftId);
    checkWarnings(shiftId);
  }

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Shift for {member.name}</DialogTitle>
          <DialogDescription>
            Manually change the shift for this team member for the current rota period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="shiftId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Shift</FormLabel>
                  <Select onValueChange={handleShiftChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a shift" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sortedShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name} ({shift.startTime} - {shift.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {warnings.length > 0 && (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>
                        <ul className="list-disc pl-5">
                            {warnings.map((w, i) => <li key={i}>{w}</li>)}
                        </ul>
                    </AlertDescription>
                </Alert>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Change</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
