"use client";

import { useRotaStore, useRotaStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarCog, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function RotaManager() {
  const { generateRota, cloneRota } = useRotaStoreActions();
  const teamMembers = useRotaStore(state => state.teamMembers);
  const { toast } = useToast();

  const handleGenerate = () => {
    if (teamMembers.length === 0) {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Cannot generate a rota with no team members.",
      });
      return;
    }
    generateRota();
    toast({
      title: "Rota Generated",
      description: "A new 14-day rota has been successfully generated.",
    });
  };

  const handleClone = () => {
    cloneRota();
     toast({
      title: "Rota Cloned",
      description: "The next 14-day rota has been created based on the previous one.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rota Management</CardTitle>
        <CardDescription>
          Generate a new rota from scratch or clone the last rota for the upcoming period.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button><CalendarCog />Generate New Rota</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a completely new rota for the current period, potentially overwriting existing assignments. This action is based on the initial assignment logic.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleGenerate}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="secondary"><Copy />Clone & Rotate Rota</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create the next 14-day rota by rotating team members from the current period. Any assignments in the upcoming period will be overwritten.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClone}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
