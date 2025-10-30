
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
          <CardTitle className="text-3xl">User Guide</CardTitle>
          <CardDescription>
            Everything you need to know to use RotaPro effectively.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-lg">
                Dashboard
              </AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                The Dashboard is your main view for the current, active rota.
                <ul className="list-disc space-y-2 pl-6 mt-4">
                  <li>
                    <strong>Generate Rota:</strong> Click this to open a calendar where you can select a start date (must be a Monday) to generate a new 14-day rota.
                  </li>
                  <li>
                    <strong>Swap Shifts:</strong> Allows you to select two team members from the current rota to exchange their assigned shifts.
                  </li>
                  <li>
                    <strong>Export:</strong> Download the currently displayed rota as a CSV file for spreadsheets or as a PNG image for sharing.
                  </li>
                   <li>
                    <strong>Generation History:</strong> View a list of all previously generated rotas. Click on any item to make it the active rota displayed on the dashboard. You can also delete old rotas from here.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger className="text-lg">Config Panel</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                The Config Panel is where you set up your team and shifts.
                 <ul className="list-disc space-y-2 pl-6 mt-4">
                  <li>
                    <strong>Team Members:</strong> Add new members to your team, edit their names, or assign them a permanent "fixed" shift that won't change during rota generation. You can also remove members from the team.
                  </li>
                  <li>
                    <strong>Shifts:</strong> Define the shifts your team works. You can set the name, start/end times, sequence (for rotation), and minimum/maximum team members required. You can also mark a shift as "Extreme," which prevents a team member from being assigned to another extreme shift immediately after.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger className="text-lg">Rota Matrix</AccordionTrigger>
              <AccordionContent className="text-base leading-relaxed">
                The Rota Matrix provides a historical overview of all generated rotas. It displays a table with team members as rows and rota periods as columns, showing who was assigned to which shift in each period. This is useful for spotting long-term patterns and ensuring fairness.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </motion.div>
  );
}
