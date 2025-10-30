"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TeamManager } from "@/components/admin/team-manager";
import { ShiftManager } from "@/components/admin/shift-manager";
import { RotaManager } from "@/components/admin/rota-manager";
import { Users, Clock, CalendarCog } from "lucide-react";

export default function AdminPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Admin Panel</CardTitle>
          <CardDescription>Manage your team, shifts, and rotas from one place.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="team">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="team"><Users className="mr-2 h-4 w-4" />Team Members</TabsTrigger>
              <TabsTrigger value="shifts"><Clock className="mr-2 h-4 w-4" />Shifts</TabsTrigger>
              <TabsTrigger value="rota"><CalendarCog className="mr-2 h-4 w-4" />Rota</TabsTrigger>
            </TabsList>
            <TabsContent value="team" className="mt-6">
              <TeamManager />
            </TabsContent>
            <TabsContent value="shifts" className="mt-6">
              <ShiftManager />
            </TabsContent>
            <TabsContent value="rota" className="mt-6">
              <RotaManager />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
