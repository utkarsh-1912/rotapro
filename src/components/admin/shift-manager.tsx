
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
import { Pencil, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";

const shiftSchema = z.object({
  name: z.string().min(1, "Shift name is required"),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid time format (HH:mm)"),
  sequence: z.coerce.number().int().min(1, "Sequence must be at least 1"),
  isExtreme: z.boolean(),
  minTeam: z.coerce.number().int().min(0, "Min team must be non-negative"),
  maxTeam: z.coerce.number().int().min(1, "Max team must be at least 1"),
}).refine(data => data.maxTeam >= data.minTeam, {
    message: "Max team must be greater than or equal to min team.",
    path: ["maxTeam"],
});

function ShiftForm({ shift, setOpen }: { shift?: Shift; setOpen: (open: boolean) => void }) {
    const { addShift, updateShift } = useRotaStoreActions();
    const { toast } = useToast();
    const isEditMode = !!shift;

    const form = useForm<z.infer<typeof shiftSchema>>({
        resolver: zodResolver(shiftSchema),
        defaultValues: isEditMode ? {
            ...shift,
        } : {
            name: "",
            startTime: "09:00",
            endTime: "17:00",
            sequence: 1,
            isExtreme: false,
            minTeam: 1,
            maxTeam: 1,
        },
    });

    function onSubmit(values: z.infer<typeof shiftSchema>) {
        if (isEditMode) {
            updateShift(shift.id, values);
            toast({
                title: "Shift Updated",
                description: `The ${values.name} shift has been updated.`,
            });
        } else {
            addShift(values);
            toast({
                title: "Shift Added",
                description: `The ${values.name} shift has been added.`,
            });
        }
        
        setOpen(false);
        form.reset();
    }
    
    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? `Update the details for the ${shift.name} shift.` : 'Enter the details for the new shift.'}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>Shift Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Night Shift" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
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
                     <FormField
                        control={form.control}
                        name="sequence"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sequence</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="isExtreme"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-6">
                               <FormControl>
                                    <Checkbox
                                    id="isExtreme"
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <FormLabel htmlFor="isExtreme" className="font-normal">
                                    Extreme Shift
                                </FormLabel>
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="minTeam"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Min Members</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="maxTeam"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Members</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
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
                    <Button type="submit">{isEditMode ? 'Save Changes' : 'Add Shift'}</Button>
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
  
  const sortedShifts = React.useMemo(() => [...shifts].sort((a,b) => a.sequence - b.sequence), [shifts]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Shift Management</CardTitle>
            <CardDescription>
            View, edit, and create the available shifts and their properties.
            </CardDescription>
        </div>
         <Dialog open={openDialogs['new-shift'] || false} onOpenChange={(isOpen) => setOpen('new-shift', isOpen)}>
            <DialogTrigger asChild>
                <Button><Plus /> Add Shift</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <ShiftForm setOpen={(isOpen) => setOpen('new-shift', isOpen)} />
            </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Seq.</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Team Size</TableHead>
              <TableHead>Extreme</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedShifts.map((shift) => (
              <TableRow key={shift.id}>
                <TableCell className="font-mono">{shift.sequence}</TableCell>
                <TableCell className="font-medium">{shift.name}</TableCell>
                <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                <TableCell className="font-mono">{shift.minTeam} - {shift.maxTeam}</TableCell>
                <TableCell>
                  {shift.isExtreme && <Badge variant="destructive">Yes</Badge>}
                </TableCell>
                <TableCell className="text-right">
                   <Dialog open={openDialogs[shift.id] || false} onOpenChange={(isOpen) => setOpen(shift.id, isOpen)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit Shift</span>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <ShiftForm shift={shift} setOpen={(isOpen) => setOpen(shift.id, isOpen)} />
                    </DialogContent>
                  </Dialog>
                </TableCell>
              </TableRow>
            ))}
             {shifts.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No shifts defined.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
