
"use client";

import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ListChecks, ListTree, Users } from "lucide-react";

export default function GuidePage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">How to use RotaPro</CardTitle>
          <CardDescription>
            Your step-by-step guide to mastering team scheduling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg font-semibold justify-start gap-3">
                <Users className="h-5 w-5 text-primary shrink-0" />
                Step 1: Set Up Your Team & Shifts
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-8 pt-2">
                <p className="mb-4">Go to the **Config Panel** to define who is on your team and what shifts they work.</p>
                <h4 className="font-semibold mb-2 text-primary">Team Members Tab</h4>
                <ul className="list-disc space-y-2 pl-6 mb-6">
                  <li>Click **Add Member** to create a new team member.</li>
                  <li>Enter their name.</li>
                  <li>Optionally, assign a **Fixed Shift** if they should not be part of the automatic rotation.</li>
                  <li>Use the pencil icon to edit or the trash icon to delete members.</li>
                </ul>
                 <h4 className="font-semibold mb-2 text-primary">Shifts Tab</h4>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Click **Add Shift** to define a new work shift.</li>
                  <li>Set the shift's **name**, **start/end times**, and **sequence** for rotation order.</li>
                  <li>Define **min/max team members** required for the shift.</li>
                  <li>Mark a shift as **"Extreme"** to prevent members being assigned to two extreme shifts back-to-back.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold justify-start gap-3">
                <ListChecks className="mr-3 h-5 w-5 text-primary shrink-0" />
                Step 2: Generate & Manage Your Rota
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-8 pt-2">
                <p className="mb-4">Once your team is set up, head to the **Dashboard** to create and manage your schedules.</p>
                <h4 className="font-semibold mb-2 text-primary">Generating a Rota</h4>
                 <ol className="list-decimal space-y-2 pl-6 mb-6">
                  <li>Click the **Generate Rota** button.</li>
                  <li>In the popup, select a **Monday** as the start date for your 14-day schedule.</li>
                  <li>Click **Generate**. Your new rota will appear on the dashboard.</li>
                </ol>
                <h4 className="font-semibold mb-2 text-primary">Managing the Active Rota</h4>
                 <ul className="list-disc space-y-2 pl-6">
                    <li>**Swap Shifts**: Select two team members to instantly swap their assigned shifts.</li>
                    <li>**Export**: Download the current rota as a CSV spreadsheet or a PNG image.</li>
                    <li>**Edit Assignments**: Click the edit icon in the **Generation History** list to manually change assignments for any team member in that rota.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold justify-start gap-3">
                <ListTree className="mr-3 h-5 w-5 text-primary shrink-0" />
                Step 3: Analyze Rota History
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-8 pt-2">
                <p className="mb-4">Use the **Rota Matrix** to see a long-term view of assignments and ensure fairness.</p>
                <ul className="list-disc space-y-2 pl-6">
                    <li>The matrix displays a historical table of all generated rotas.</li>
                    <li>Team members are listed as rows, and rota periods are columns.</li>
                    <li>Quickly see who was assigned to which shift and when.</li>
                    <li>Use the pagination to navigate through your entire rota history.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );
}
