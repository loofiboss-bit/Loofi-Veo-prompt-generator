import React from 'react';
import Tooltip from './Tooltip';

interface CheckboxInputProps {
  id: string;
  name: string;
  label: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tooltipText?: string;
}

const CheckboxInput: React.FC<CheckboxInputProps> = ({ id, name, label, checked, onChange, tooltipText }) => {
  const labelContent = (
    <label htmlFor={id} className="text-sm font-medium text-slate-300 select-none cursor-pointer">
      {label}
    </label>
  );

  return (
    <div className="flex items-center space-x-3 p-3 bg-slate-800/60 rounded-lg border border-slate-700">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer"
      />
      {tooltipText ? (
        <Tooltip text={tooltipText}>
          {labelContent}
        </Tooltip>
      ) : (
        labelContent
      )}
    </div>
  );
};

export default CheckboxInput;
