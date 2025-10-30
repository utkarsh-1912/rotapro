"use client";

import { useRotaStoreActions } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CalendarCog } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function RotaManager() {
  const { generateNewRota } = useRotaStoreActions();
  const { toast } = useToast();

  const handleGenerate = () => {
    generateNewRota(false);
    toast({
      title: "New Rota Generated",
      description: "A new rota for the current period has been generated.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rota Generation</CardTitle>
        <CardDescription>
          Generate a new rota for the current 14-day period. This will be added to the history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button><CalendarCog />Generate New Rota</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will create a new rota generation for the current period based on the latest team and shift configuration. The new generation will become the active one.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleGenerate}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
