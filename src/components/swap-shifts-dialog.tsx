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

const swapSchema = z.object({
  memberId1: z.string().min(1, "First member is required."),
  memberId2: z.string().min(1, "Second member is required."),
}).refine((data) => data.memberId1 !== data.memberId2, {
  message: "Cannot swap a member with themselves.",
  path: ["memberId2"],
});

type SwapShiftsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SwapShiftsDialog({ open, onOpenChange }: SwapShiftsDialogProps) {
  const teamMembers = useRotaStore((state) => state.teamMembers);
  const { swapShifts } = useRotaStoreActions();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof swapSchema>>({
    resolver: zodResolver(swapSchema),
  });

  function onSubmit(values: z.infer<typeof swapSchema>) {
    const member1 = teamMembers.find(m => m.id === values.memberId1);
    const member2 = teamMembers.find(m => m.id === values.memberId2);

    if (member1?.fixedShiftId || member2?.fixedShiftId) {
      toast({
        variant: "destructive",
        title: "Swap Failed",
        description: "Cannot swap shifts for a member who has a fixed assignment.",
      });
      return;
    }
    
    swapShifts(values.memberId1, values.memberId2);
    toast({
      title: "Shifts Swapped",
      description: `The shifts for ${member1?.name} and ${member2?.name} have been swapped for the current 14-day period.`,
    });
    onOpenChange(false);
    form.reset();
  }
  
  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const swappableMembers = teamMembers.filter(m => !m.fixedShiftId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Swap Full Rota Period</DialogTitle>
          <DialogDescription>
            Select two team members to swap their assigned shifts for the entire 14-day period. Members with fixed shifts cannot be swapped.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="memberId1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Member</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {swappableMembers.map((member) => (
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
                  <FormLabel>Second Member</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {swappableMembers.map((member) => (
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
              <Button type="submit">Swap Shifts</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
