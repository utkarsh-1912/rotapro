"use client";

import { RotaMatrix } from "@/components/admin/rota-matrix";
import { motion } from "framer-motion";

export default function MatrixPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-4 sm:p-6"
    >
      <RotaMatrix />
    </motion.div>
  );
}
