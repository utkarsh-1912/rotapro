
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:underline mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
        </Link>
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-extrabold tracking-tight">About RotaPro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 text-muted-foreground">
            <p className="text-lg">
              RotaPro is a powerful, AI-driven application designed to simplify the complexities of team scheduling and rota management. Our mission is to provide an intuitive, efficient, and fair system for managers and team members alike.
            </p>
            <p>
              Built with modern technology, RotaPro leverages intelligent algorithms to automatically generate balanced schedules, taking into account shift constraints, team member availability, and fairness rules. We believe that proper scheduling is the backbone of a productive and happy team, and we're here to make that process seamless.
            </p>
            <h3 className="text-xl font-semibold text-foreground pt-4">Our Vision</h3>
            <p>
              We envision a world where scheduling is no longer a time-consuming chore but a strategic tool that enhances operational efficiency and employee satisfaction. By automating the tedious aspects of creating and managing rotas, we empower businesses to focus on what truly matters: their people and their goals.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
