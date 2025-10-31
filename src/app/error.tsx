
"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg text-center">
            <CardHeader>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
                    <AlertTriangle className="h-8 w-8 text-destructive" />
                </div>
                <CardTitle className="text-3xl font-bold text-destructive">An Error Occurred</CardTitle>
                <CardDescription className="text-lg">
                    We're sorry, but something went wrong.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    You can try to refresh the page, or return to the dashboard. If the problem persists, please contact support.
                </p>
                <div className="bg-muted p-3 rounded-md text-left">
                    <p className="text-sm font-semibold text-foreground">Error Details:</p>
                    <p className="text-sm text-destructive-foreground font-mono bg-destructive/20 p-2 rounded mt-1">
                        {error.message || "No error message provided."}
                    </p>
                </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
                <Button onClick={() => reset()}>Try Again</Button>
                <Button variant="outline" asChild>
                    <Link href="/">Go to Homepage</Link>
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
