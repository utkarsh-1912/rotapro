import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import Papa from "papaparse";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function downloadCsv(data: (string | number)[][], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
