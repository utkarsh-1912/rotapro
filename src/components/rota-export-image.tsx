
"use client";

import React from "react";
import { format, parseISO, addDays } from "date-fns";
import { RotaTable } from "./rota-table";
import type { RotaGeneration } from "@/lib/types";

interface RotaExportImageProps {
    activeGeneration: RotaGeneration;
}

export const RotaExportImage = React.forwardRef<HTMLDivElement, RotaExportImageProps>(
    ({ activeGeneration }, ref) => {
        const startDate = parseISO(activeGeneration.startDate);
        const endDate = addDays(startDate, 13);
        const title = `ROTA Period: ${format(startDate, 'd MMM yyyy')} - ${format(endDate, 'd MMM yyyy')}`;
        
        return (
            <div ref={ref} className="p-4 bg-white text-black">
                <h2 className="text-xl font-bold text-center mb-3">{title}</h2>
                <RotaTable />
            </div>
        );
    }
);

RotaExportImage.displayName = 'RotaExportImage';
