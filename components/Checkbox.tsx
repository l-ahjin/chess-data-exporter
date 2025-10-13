
import React from 'react';

interface CheckboxProps {
    id: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, checked, onChange }) => {
    return (
        <div className="relative flex items-center">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="peer shrink-0 appearance-none w-5 h-5 border-2 border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 checked:bg-blue-600 checked:border-0 focus:outline-none focus:ring-offset-0 focus:ring-2 focus:ring-blue-500 transition-all"
            />
            <svg
                className="absolute w-5 h-5 pointer-events-none hidden peer-checked:block text-white"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
        </div>
    );
};

export default Checkbox;
