'use client';

import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import {
  buildAutoslideValue,
  parseAutoslideParts,
} from '@/services/banner-ads.service';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number) {
  return String(n).padStart(2, '0');
}

type TimePartSelectProps = {
  label: string;
  value: number;
  options: number[];
  disabled?: boolean;
  onChange: (value: number) => void;
};

function TimePartSelect({ label, value, options, disabled, onChange }: TimePartSelectProps) {
  const strValue = pad(value);
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
      <Select
        value={strValue}
        onValueChange={(v) => onChange(Number(v))}
        disabled={disabled}
      >
        <SelectTrigger className="w-[68px] bg-white justify-center">
          <span className="font-mono tabular-nums">{strValue}</span>
        </SelectTrigger>
        <SelectContent className="max-h-56">
          {options.map((n) => (
            <SelectItem key={n} value={pad(n)}>
              {pad(n)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export type AutoslideTimePickerProps = {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
};

export function AutoslideTimePicker({
  value,
  onChange,
  disabled = false,
  className,
}: AutoslideTimePickerProps) {
  const parts = useMemo(() => parseAutoslideParts(value), [value]);

  const update = (next: Partial<{ hh: number; mm: number; ss: number }>) => {
    onChange(buildAutoslideValue(
      next.hh ?? parts.hh,
      next.mm ?? parts.mm,
      next.ss ?? parts.ss,
    ));
  };

  return (
    <div className={cn('flex items-end gap-2', className)}>
      <TimePartSelect
        label="HH"
        value={parts.hh}
        options={HOURS}
        disabled={disabled}
        onChange={(hh) => update({ hh })}
      />
      <span className="pb-2 text-gray-400 font-semibold">:</span>
      <TimePartSelect
        label="MM"
        value={parts.mm}
        options={MINUTES}
        disabled={disabled}
        onChange={(mm) => update({ mm })}
      />
      <span className="pb-2 text-gray-400 font-semibold">:</span>
      <TimePartSelect
        label="SS"
        value={parts.ss}
        options={SECONDS}
        disabled={disabled}
        onChange={(ss) => update({ ss })}
      />
    </div>
  );
}
