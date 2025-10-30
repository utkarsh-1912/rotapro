"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import type { Shift } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const shiftSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
});

function EditShiftForm({ shift, setOpen }: { shift: Shift; setOpen: (open: boolean) => void }) {
  const { updateShift } = useRotaStoreActions();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof shiftSchema>>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
    },
  });

  function onSubmit(values: z.infer<typeof shiftSchema>) {
    updateShift(shift.id, values);
    toast({
      title: "Shift Updated",
      description: `The ${shift.name} shift has been updated.`,
    });
    setOpen(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <DialogHeader>
          <DialogTitle>Edit Shift: {shift.name}</DialogTitle>
          <DialogDescription>
            Adjust the start and end times for this shift.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit">Save Changes</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

export function ShiftManager() {
  const shifts = useRotaStore((state) => state.shifts);
  const [openDialogs, setOpenDialogs] = React.useState<Record<string, boolean>>({});

  const setOpen = (id: string, open: boolean) => {
    setOpenDialogs(prev => ({ ...prev, [id]: open }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Management</CardTitle>
        <CardDescription>
          View and edit the available shifts and their hours.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Shift Name</TableHead>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-medium">{shift.name}</TableCell>
                <TableCell>{shift.startTime}</TableCell>
                <TableCell>{shift.endTime}</TableCell>
                <TableCell className="text-right">
                   <Dialog open={openDialogs[shift.id] || false} onOpenChange={(isOpen) => setOpen(shift.id, isOpen)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit Shift</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <EditShiftForm shift={shift} setOpen={(isOpen) => setOpen(shift.id, isOpen)} />
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
