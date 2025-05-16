import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface DatePickerProps {
  date: string;
  setDate: (date: string) => void;
  className?: string;
}

/**
 * Custom DatePicker component that correctly stores and formats dates
 * 
 * This component solves the common date handling issues by:
 * 1. Storing dates as ISO strings (YYYY-MM-DD)
 * 2. Handling timezone differences correctly
 * 3. Providing both calendar selection and manual input options
 * 4. Validating date formats
 */
export function DatePicker({ date, setDate, className = "" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(date ? format(new Date(date), "yyyy-MM-dd") : "");
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync input value when date prop changes
  useEffect(() => {
    if (date) {
      try {
        const formattedDate = format(new Date(date), "yyyy-MM-dd");
        setInputValue(formattedDate);
      } catch (error) {
        console.error("Error formatting date:", error);
        setInputValue("");
      }
    } else {
      setInputValue("");
    }
  }, [date]);

  // Handle date changes from calendar
  const handleCalendarSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Store date in ISO format (YYYY-MM-DD) without time to avoid timezone issues
      const isoDate = format(newDate, "yyyy-MM-dd");
      setDate(isoDate);
      setInputValue(isoDate);
      setOpen(false);
    }
  };

  // Handle direct input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Validate ISO date format (YYYY-MM-DD)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      // Check if it's a valid date
      const parsedDate = new Date(value);
      if (!isNaN(parsedDate.getTime())) {
        setDate(value);
      }
    }
  };

  // Handle input blur (for manual entry)
  const handleInputBlur = () => {
    // If input is empty, clear the date
    if (!inputValue.trim()) {
      setDate("");
      return;
    }
    
    // Try to parse the entered date
    try {
      // Check if it's already in ISO format
      if (/^\d{4}-\d{2}-\d{2}$/.test(inputValue)) {
        const parsedDate = new Date(inputValue);
        if (!isNaN(parsedDate.getTime())) {
          const isoDate = format(parsedDate, "yyyy-MM-dd");
          setDate(isoDate);
          setInputValue(isoDate);
        } else {
          // Reset to previous valid date if parsing fails
          setInputValue(date ? format(new Date(date), "yyyy-MM-dd") : "");
        }
      } else {
        // Try to parse various formats
        const parsedDate = new Date(inputValue);
        if (!isNaN(parsedDate.getTime())) {
          const isoDate = format(parsedDate, "yyyy-MM-dd");
          setDate(isoDate);
          setInputValue(isoDate);
        } else {
          // Reset to previous valid date if parsing fails
          setInputValue(date ? format(new Date(date), "yyyy-MM-dd") : "");
        }
      }
    } catch (error) {
      console.error("Error parsing date:", error);
      // Reset to previous valid date on error
      setInputValue(date ? format(new Date(date), "yyyy-MM-dd") : "");
    }
  };

  // Handle keydown for Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleInputBlur();
      inputRef.current?.blur();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={`w-full justify-start text-left font-normal ${
              !date ? "text-muted-foreground" : ""
            }`}
            onClick={() => setOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? (
              format(new Date(date), "PPP")
            ) : (
              <span>Select a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date ? new Date(date) : undefined}
            onSelect={handleCalendarSelect}
            initialFocus
          />
          <div className="p-3 border-t">
            <Input
              ref={inputRef}
              placeholder="YYYY-MM-DD"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              className="text-xs"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Format: YYYY-MM-DD
            </p>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}