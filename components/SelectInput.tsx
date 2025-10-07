
import React from 'react';
import { SelectOption } from '../types';

interface SelectInputProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const SelectInput: React.FC<SelectInputProps> = ({ label, options, value, onChange }) => {
  const id = `select-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="w-full bg-gray-900/50 border border-gray-600 rounded-lg shadow-sm text-gray-200 focus:ring-purple-500 focus:border-purple-500 transition duration-150 ease-in-out p-3 appearance-none bg-no-repeat bg-right-4"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
          backgroundPosition: 'right 0.75rem center',
          backgroundSize: '1.25em 1.25em',
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-gray-800 text-gray-200">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectInput;
