
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
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary shrink-0" />
                    Step 1: Set Up Your Team & Shifts
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-8 pt-2">
                <p className="mb-4">Go to the <span className="font-semibold text-primary">Config Panel</span> to define who is on your team and what shifts they work.</p>
                <h4 className="font-semibold mb-2 text-primary">Team Members Tab</h4>
                <ul className="list-disc space-y-2 pl-6 mb-6">
                  <li>Click <span className="font-semibold text-primary">Add Member</span> to create a new team member.</li>
                  <li>Enter their name.</li>
                  <li>Optionally, assign a <span className="font-semibold text-primary">Fixed Shift</span> if they should not be part of the automatic rotation.</li>
                  <li>Use the pencil icon to edit or the trash icon to delete members.</li>
                </ul>
                 <h4 className="font-semibold mb-2 text-primary">Shifts Tab</h4>
                <ul className="list-disc space-y-2 pl-6">
                  <li>Click <span className="font-semibold text-primary">Add Shift</span> to define a new work shift.</li>
                  <li>Set the shift's <span className="font-semibold text-primary">name</span>, <span className="font-semibold text-primary">start/end times</span>, and <span className="font-semibold text-primary">sequence</span> for rotation order.</li>
                  <li>Define <span className="font-semibold text-primary">min/max team members</span> required for the shift.</li>
                  <li>Mark a shift as <span className="font-semibold text-primary">"Extreme"</span> to prevent members being assigned to two extreme shifts back-to-back.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                    <ListChecks className="mr-3 h-5 w-5 text-primary shrink-0" />
                    Step 2: Generate & Manage Your Rota
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-8 pt-2">
                <p className="mb-4">Once your team is set up, head to the <span className="font-semibold text-primary">Dashboard</span> to create and manage your schedules.</p>
                <h4 className="font-semibold mb-2 text-primary">Generating a Rota</h4>
                 <ol className="list-decimal space-y-2 pl-6 mb-6">
                  <li>Click the <span className="font-semibold text-primary">Generate Rota</span> button.</li>
                  <li>In the popup, select a <span className="font-semibold text-primary">Monday</span> as the start date for your 14-day schedule.</li>
                  <li>Click <span className="font-semibold text-primary">Generate</span>. Your new rota will appear on the dashboard.</li>
                </ol>
                <h4 className="font-semibold mb-2 text-primary">Managing the Active Rota</h4>
                 <ul className="list-disc space-y-2 pl-6">
                    <li><span className="font-semibold text-primary">Swap Shifts</span>: Select two team members to instantly swap their assigned shifts.</li>
                    <li><span className="font-semibold text-primary">Export</span>: Download the current rota as a CSV spreadsheet or a PNG image.</li>
                    <li><span className="font-semibold text-primary">Edit Assignments</span>: Click the edit icon in the <span className="font-semibold text-primary">Generation History</span> list to manually change assignments for any team member in that rota.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg font-semibold">
                <div className="flex items-center gap-3">
                    <ListTree className="mr-3 h-5 w-5 text-primary shrink-0" />
                    Step 3: Analyze Rota History
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed pl-8 pt-2">
                <p className="mb-4">Use the <span className="font-semibold text-primary">Rota Matrix</span> page to see a long-term view of assignments and ensure fairness.</p>
                <ul className="list-disc space-y-2 pl-6">
                    <li>The matrix displays a historical table of all generated rotas.</li>
                    <li>Team members are listed as rows, and rota periods are columns.</li>
                    <li>Quickly see who was assigned to which shift and when. Use the pagination to navigate through your entire rota history.</li>
                    <li>The <span className="font-semibold text-primary">Manual Swap History</span> table at the bottom logs all manual shift swaps, showing who was swapped and when, to help you track changes.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );
}
