
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
import type { TeamMember } from "@/lib/types";

const swapWeekendSchema = z.object({
  memberId1: z.string().min(1, "First member is required."),
  memberId2: z.string().min(1, "Second member is required."),
}).refine((data) => data.memberId1 !== data.memberId2, {
  message: "Cannot swap a member with themselves.",
  path: ["memberId2"],
});

type SwapWeekendDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  generationId: string;
};

export function SwapWeekendDialog({ open, onOpenChange, generationId }: SwapWeekendDialogProps) {
  const { weekendRotas, teamMembers } = useRotaStore();
  const { swapWeekendAssignments } = useRotaStoreActions();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof swapWeekendSchema>>({
    resolver: zodResolver(swapWeekendSchema),
    defaultValues: {
      memberId1: "",
      memberId2: "",
    },
  });

  const membersWithDuty = React.useMemo(() => {
    const memberIdsWithWeekendDuty = new Set(
        weekendRotas
            .filter(r => r.generationId === generationId)
            .map(r => r.memberId)
    );
    return teamMembers.filter(m => memberIdsWithWeekendDuty.has(m.id));
  }, [weekendRotas, teamMembers, generationId]);

  const allFlexibleMembers = React.useMemo(() => 
    teamMembers.filter(m => !m.fixedShiftId),
    [teamMembers]
  );

  function onSubmit(values: z.infer<typeof swapWeekendSchema>) {
    swapWeekendAssignments(generationId, values.memberId1, values.memberId2);
    
    const member1 = teamMembers.find(m => m.id === values.memberId1);
    const member2 = teamMembers.find(m => m.id === values.memberId2);

    toast({
      title: "Weekend Duties Swapped",
      description: `All weekend assignments for ${member1?.name} and ${member2?.name} have been swapped for this rota period.`,
    });
    onOpenChange(false);
  }
  
  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Swap Weekend Duties</DialogTitle>
          <DialogDescription>
            Select a member currently on duty and another member to swap all their weekend assignments with for this period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="memberId1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Member Currently on Duty</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {membersWithDuty.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="memberId2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Swap With</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allFlexibleMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">Swap Duties</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
