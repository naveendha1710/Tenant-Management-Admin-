import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, FileText } from "lucide-react";

interface ExportDropdownProps {
  onExportExcel: () => void;
  onExportPDF: () => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}

export function ExportDropdown({ 
  onExportExcel, 
  onExportPDF, 
  variant = "outline",
  size = "sm" 
}: ExportDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size}>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPDF}>
          <FileText className="mr-2 h-4 w-4" />
          Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}