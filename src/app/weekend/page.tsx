"use client";

import { WeekendRotaManager } from "@/components/admin/weekend-rota-manager";
import { motion } from "framer-motion";

export default function WeekendRotaPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <WeekendRotaManager />
    </motion.div>
  );
}
