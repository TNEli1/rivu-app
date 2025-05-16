import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
  className?: string;
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  const formattedDisplayDate = date ? 
    format(new Date(date), "MMMM d, yyyy") : 
    "Select date";

  const handleSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // Format the date as YYYY-MM-DD for storing
      const formattedDate = format(selectedDate, "yyyy-MM-dd");
      setDate(formattedDate);
      console.log("Date selected:", formattedDate);
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              "h-10 px-3 py-2 border-primary/20 bg-background/60 hover:bg-background/80 focus:ring-1 focus:ring-primary/30"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary/70" />
            {formattedDisplayDate}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={handleSelect}
            initialFocus
            className="rounded-md border border-primary/10"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}