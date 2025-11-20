'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock
} from 'lucide-react';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxDate?: Date;
  minDate?: Date;
  presets?: Array<{
    label: string;
    value: DateRange;
  }>;
}

export default function DateRangePicker({
  value = { startDate: null, endDate: null },
  onChange,
  placeholder = 'Select date range',
  disabled = false,
  className = '',
  maxDate,
  minDate,
  presets
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedRange, setSelectedRange] = useState<DateRange>(value);
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);
  const [selectingStart, setSelectingStart] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Default presets if none provided
  const defaultPresets = [
    {
      label: 'Today',
      value: {
        startDate: new Date(),
        endDate: new Date()
      }
    },
    {
      label: 'Yesterday',
      value: (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday,
          endDate: yesterday
        };
      })()
    },
    {
      label: 'This Week',
      value: (() => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
        return {
          startDate: startOfWeek,
          endDate: endOfWeek
        };
      })()
    },
    {
      label: 'Last Week',
      value: (() => {
        const now = new Date();
        const startOfLastWeek = new Date(now.setDate(now.getDate() - now.getDay() - 7));
        const endOfLastWeek = new Date(startOfLastWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
        return {
          startDate: startOfLastWeek,
          endDate: endOfLastWeek
        };
      })()
    },
    {
      label: 'This Month',
      value: (() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          startDate: startOfMonth,
          endDate: endOfMonth
        };
      })()
    },
    {
      label: 'Last Month',
      value: (() => {
        const now = new Date();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: startOfLastMonth,
          endDate: endOfLastMonth
        };
      })()
    },
    {
      label: 'Last 7 Days',
      value: (() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 7);
        return {
          startDate: start,
          endDate: end
        };
      })()
    },
    {
      label: 'Last 30 Days',
      value: (() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        return {
          startDate: start,
          endDate: end
        };
      })()
    }
  ];

  const availablePresets = presets || defaultPresets;

  // Handle clicks outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date display
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get display text
  const getDisplayText = () => {
    if (!selectedRange.startDate && !selectedRange.endDate) {
      return placeholder;
    }

    if (selectedRange.startDate && !selectedRange.endDate) {
      return formatDate(selectedRange.startDate);
    }

    if (selectedRange.startDate && selectedRange.endDate) {
      if (selectedRange.startDate.getTime() === selectedRange.endDate.getTime()) {
        return formatDate(selectedRange.startDate);
      }
      return `${formatDate(selectedRange.startDate)} - ${formatDate(selectedRange.endDate)}`;
    }

    return placeholder;
  };

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (selectingStart || !selectedRange.startDate) {
      setSelectedRange({ startDate: date, endDate: null });
      setSelectingStart(false);
    } else {
      if (date < selectedRange.startDate) {
        setSelectedRange({ startDate: date, endDate: selectedRange.startDate });
      } else {
        setSelectedRange({ ...selectedRange, endDate: date });
      }
      setSelectingStart(true);
    }
  };

  // Handle preset selection
  const handlePresetClick = (preset: { label: string; value: DateRange }) => {
    setSelectedRange(preset.value);
    onChange(preset.value);
    setIsOpen(false);
  };

  // Apply selection
  const applySelection = () => {
    onChange(selectedRange);
    setIsOpen(false);
  };

  // Clear selection
  const clearSelection = () => {
    const emptyRange = { startDate: null, endDate: null };
    setSelectedRange(emptyRange);
    onChange(emptyRange);
    setIsOpen(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDayOfMonth.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  // Check if date is in range
  const isDateInRange = (date: Date) => {
    if (!selectedRange.startDate) return false;

    const compareDate = hoveredDate || selectedRange.endDate;
    if (!compareDate) return false;

    const start = selectedRange.startDate;
    const end = compareDate;

    if (start > end) {
      return date >= end && date <= start;
    }

    return date >= start && date <= end;
  };

  // Check if date is selected endpoint
  const isDateSelected = (date: Date) => {
    return (
      (selectedRange.startDate && date.getTime() === selectedRange.startDate.getTime()) ||
      (selectedRange.endDate && date.getTime() === selectedRange.endDate.getTime())
    );
  };

  // Check if date is disabled
  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const calendarDays = generateCalendarDays();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input Field */}
      <div
        ref={inputRef}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg cursor-pointer
          transition-colors
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : ''}
        `}
      >
        <Calendar className="h-4 w-4 text-gray-400" />
        <span className={`flex-1 text-sm ${selectedRange.startDate ? 'text-gray-900' : 'text-gray-500'}`}>
          {getDisplayText()}
        </span>
        {selectedRange.startDate && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              clearSelection();
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-3 w-3 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 min-w-96">
          <div className="flex gap-4">
            {/* Presets */}
            <div className="w-48 border-r border-gray-200 pr-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Select</h4>
              <div className="space-y-1">
                {availablePresets.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetClick(preset)}
                    className="w-full text-left px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="flex-1">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <h4 className="text-sm font-medium">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h4>

                <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                  <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((date, index) => (
                  <div key={index} className="h-8 flex items-center justify-center">
                    {date && (
                      <button
                        onClick={() => !isDateDisabled(date) && handleDateClick(date)}
                        onMouseEnter={() => setHoveredDate(date)}
                        onMouseLeave={() => setHoveredDate(null)}
                        disabled={isDateDisabled(date)}
                        className={`
                          w-7 h-7 text-xs rounded transition-colors
                          ${isDateDisabled(date)
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-700 hover:bg-blue-100'
                          }
                          ${isDateSelected(date)
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : ''
                          }
                          ${isDateInRange(date) && !isDateSelected(date)
                            ? 'bg-blue-100'
                            : ''
                          }
                        `}
                      >
                        {date.getDate()}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  {selectingStart ? 'Select start date' : 'Select end date'}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={clearSelection}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Clear
                  </button>
                  <button
                    onClick={applySelection}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}