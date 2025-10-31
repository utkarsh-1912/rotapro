"use client";

import React from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import type { RotaAssignments } from "@/lib/types";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { AlertTriangle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "./ui/table";
import { Label } from "./ui/label";

type EditFullRotaDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
};

export function EditFullRotaDialog({ open, onOpenChange, generationId }: EditFullRotaDialogProps) {
  const { shifts, generationHistory } = useRotaStore();
  const { updateAssignmentsForGeneration } = useRotaStoreActions();
  const { toast } = useToast();
  
  const [currentAssignments, setCurrentAssignments] = React.useState<RotaAssignments>({});
  const [comments, setComments] = React.useState<Record<string, string>>({});
  const [warnings, setWarnings] = React.useState<string[]>([]);
  
  const targetGeneration = React.useMemo(() => 
    generationHistory.find(g => g.id === generationId)
  , [generationHistory, generationId]);
  
  const teamMembers = targetGeneration?.teamMembersAtGeneration || [];
  const shiftMap = React.useMemo(() => new Map(shifts.map(s => [s.id, s])), [shifts]);
  const sortedShifts = React.useMemo(() => [...shifts].sort((a,b) => a.sequence - b.sequence), [shifts]);

  const calculateWarnings = (assignments: RotaAssignments) => {
    const newWarnings: string[] = [];
    const shiftCounts: Record<string, number> = {};
    shifts.forEach(s => shiftCounts[s.id] = 0);
    Object.values(assignments).forEach(shiftId => {
      if (shiftId) shiftCounts[shiftId]++;
    });

    shifts.forEach(shift => {
      if (shiftCounts[shift.id] > shift.maxTeam) {
        newWarnings.push(`"${shift.name}" will be over capacity (max: ${shift.maxTeam}).`);
      }
      if (shiftCounts[shift.id] < shift.minTeam) {
        newWarnings.push(`"${shift.name}" will be under capacity (min: ${shift.minTeam}).`);
      }
    });

    setWarnings(newWarnings);
  };
  
  React.useEffect(() => {
    if (open && targetGeneration) {
      setCurrentAssignments(targetGeneration.assignments);
      setComments(targetGeneration.comments || {});
      calculateWarnings(targetGeneration.assignments);
    } else {
      setCurrentAssignments({});
      setComments({});
      setWarnings([]);
    }
  }, [open, targetGeneration]);

  const handleAssignmentChange = (memberId: string, newShiftId: string) => {
    const newAssignments = { ...currentAssignments, [memberId]: newShiftId };
    setCurrentAssignments(newAssignments);
    calculateWarnings(newAssignments);
  };

  const handleCommentChange = (memberId: string, text: string) => {
    setComments(prev => ({...prev, [memberId]: text}));
  }

  const handleSave = () => {
    updateAssignmentsForGeneration(generationId, currentAssignments, comments);
    toast({
      title: "Rota Updated",
      description: `The rota has been successfully updated.`,
    });
    onOpenChange(false);
  }

  if (!targetGeneration) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Edit Rota Assignments</DialogTitle>
          <DialogDescription>
            Manually change the shifts for each team member for this rota period.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {teamMembers.map(member => (
              <div key={member.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center border p-3 rounded-md">
                <Label className="font-medium">{member.name}</Label>
                <Select 
                    value={currentAssignments[member.id] || ""}
                    onValueChange={(newShiftId) => handleAssignmentChange(member.id, newShiftId)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a shift" />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedShifts.map((shift) => (
                        <SelectItem key={shift.id} value={shift.id}>
                          {shift.name} ({shift.startTime} - {shift.endTime})
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>
                <Input 
                  placeholder="Add a comment (optional)"
                  value={comments[member.id] || ''}
                  onChange={(e) => handleCommentChange(member.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        
        {warnings.length > 0 && (
            <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Constraint Warnings</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5">
                        {warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )}

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
