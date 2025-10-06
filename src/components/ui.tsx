import React from "react";

interface SwitchProps {
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

interface SliderProps {
  id: string;
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
}

export const Switch: React.FC<SwitchProps> = ({ id, checked, onChange }) => {
  return (
    <div className="relative inline-block w-10 select-none align-middle">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="absolute right-4 block size-6 cursor-pointer appearance-none rounded-full border-4 bg-white outline-none duration-200 ease-in checked:right-0 checked:bg-brand focus:outline-none"
      />
      <label
        htmlFor={id}
        className={`block ${checked ? "bg-brand" : " bg-gray-300"} h-6 cursor-pointer overflow-hidden rounded-full`}
      />
    </div>
  );
};

export const Slider: React.FC<SliderProps> = ({ id, min, max, value, onChange }) => {
  return (
    <div className="w-full">
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
      />
    </div>
  );
};
