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
      title: "Next Rota Created",
      description: "The rota for the next 14-day period has been created by rotating team members.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rota Management</CardTitle>
        <CardDescription>
          Generate a new rota from scratch or create the next rota by rotating team members.
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
            <Button variant="secondary"><Copy />Create Next Rota</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create the rota for the next 14-day period by rotating team members. Any manual changes in that future period will be overwritten.
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
