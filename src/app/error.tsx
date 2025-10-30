"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

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
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <CardTitle className="text-2xl text-destructive">Something went wrong!</CardTitle>
                <CardDescription>
                    An unexpected error has occurred. You can try to reload the page.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">
                    Error details: {error.message}
                </p>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Button onClick={() => reset()}>Try Again</Button>
            </CardFooter>
        </Card>
    </div>
  );
}
