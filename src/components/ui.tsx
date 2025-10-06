import ChatSystem from "@/lib/class/ChatSystem";
import React, { useState } from "react";

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

interface ChatSettingsPageProps {
  chatSystem: ChatSystem;
}

export const Switch: React.FC<SwitchProps> = ({ id, checked, onChange }) => {
  return (
    <div className="relative inline-block w-10 align-middle select-none">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="checked:bg-brand outline-none focus:outline-none right-4 checked:right-0 duration-200 ease-in absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer"
      />
      <label
        htmlFor={id}
        className={`block ${checked ? "bg-brand" : " bg-gray-300"} overflow-hidden h-6 rounded-full cursor-pointer`}
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
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
    </div>
  );
};
