
"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { RotaTable } from "./rota-table";
import type { RotaGeneration } from "@/lib/types";
import { useRotaStore } from "@/lib/store";
import { Separator } from "./ui/separator";

interface RotaExportImageProps {
    activeGeneration: RotaGeneration;
}

export const RotaExportImage = React.forwardRef<HTMLDivElement, RotaExportImageProps>(
    ({ activeGeneration }, ref) => {
        const { teamMembers } = useRotaStore();
        const startDate = parseISO(activeGeneration.startDate);
        const endDate = parseISO(activeGeneration.endDate);
        const title = `ROTA Period: ${format(startDate, 'd MMM yyyy')} - ${format(endDate, 'd MMM yyyy')}`;

        const comments = activeGeneration.comments || {};
        const memberMap = new Map(teamMembers.map(m => [m.id, m.name]));
        const commentEntries = Object.entries(comments).filter(([_, comment]) => comment.trim() !== "");

        return (
            <div ref={ref} className="p-4 bg-white text-black font-body">
                <h2 className="text-xl font-bold text-center mb-3">{title}</h2>
                <RotaTable />
                {commentEntries.length > 0 && (
                    <div className="mt-4">
                        <Separator className="my-2 bg-gray-300"/>
                        <div className="space-y-1 text-xs">
                            {commentEntries.map(([memberId, comment]) => (
                                <p key={memberId}>
                                    <span className="font-semibold">{memberMap.get(memberId) || 'Unknown Member'}:</span> {comment}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }
);

RotaExportImage.displayName = 'RotaExportImage';
