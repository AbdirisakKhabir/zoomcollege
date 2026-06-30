"use client";

import React, { useEffect, useRef, type ReactNode } from "react";
import flatpickr from "flatpickr";
import "flatpickr/dist/flatpickr.css";
import { Calendar } from "lucide-react";

export type DateInputProps = {
  id: string;
  /** When set, associates label with the input */
  label?: ReactNode;
  labelClassName?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
  name?: string;
  className?: string;
  /** Full class string for the `<input>`; overrides default styling when provided */
  inputClassName?: string;
  placeholder?: string;
  "aria-label"?: string;
};

const defaultLabelClass =
  "mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300";

const defaultInputClass =
  "h-10 w-full min-w-[140px] rounded-lg border border-gray-200 bg-transparent px-3 pr-10 text-sm text-gray-800 outline-none transition-[color,box-shadow] focus:border-brand-300 focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:border-brand-500/40";

/**
 * Calendar date picker (flatpickr) with consistent styling — click to open a month calendar.
 */
export function DateInput({
  id,
  label,
  labelClassName,
  value,
  onChange,
  required,
  disabled,
  min,
  max,
  name,
  className,
  inputClassName,
  placeholder = "Select date",
  "aria-label": ariaLabel,
}: DateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fpRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const fp = flatpickr(el, {
      dateFormat: "Y-m-d",
      defaultDate: value || undefined,
      minDate: min || undefined,
      maxDate: max || undefined,
      disableMobile: true,
      monthSelectorType: "static",
      onChange: (_selectedDates, dateStr) => {
        onChangeRef.current(dateStr);
      },
    });

    fpRef.current = Array.isArray(fp) ? null : fp;

    return () => {
      if (!Array.isArray(fp)) fp.destroy();
      fpRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flatpickr init once per mount
  }, []);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (value === fp.input.value) return;
    if (value) fp.setDate(value, false);
    else fp.clear();
  }, [value]);

  useEffect(() => {
    fpRef.current?.set("minDate", min || undefined);
  }, [min]);

  useEffect(() => {
    fpRef.current?.set("maxDate", max || undefined);
  }, [max]);

  useEffect(() => {
    const fp = fpRef.current;
    if (!fp) return;
    if (disabled) fp.input.setAttribute("disabled", "disabled");
    else fp.input.removeAttribute("disabled");
  }, [disabled]);

  const inputCls = inputClassName ?? defaultInputClass;

  return (
    <div className={className}>
      {label ? (
        <label htmlFor={id} className={labelClassName ?? defaultLabelClass}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          aria-label={ariaLabel}
          readOnly
          className={inputCls.includes("pr-") ? inputCls : `${inputCls} pr-10`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">
          <Calendar className="size-5" strokeWidth={1.8} />
        </span>
      </div>
    </div>
  );
}

export default DateInput;
