import React from 'react';

interface StarRatingProps {
  value: number;
  onChange: (rating: number) => void;
  readonly?: boolean;
}

/**
 * 1–5 star rating component for prompt history entries.
 */
export function StarRating({ value, onChange, readonly = false }: StarRatingProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="button"
          aria-pressed={star <= value}
          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          disabled={readonly}
          onClick={() => !readonly && onChange(star)}
          className={`text-lg transition-colors disabled:cursor-default focus:outline-none ${
            star <= value ? 'text-yellow-400' : 'text-slate-700 hover:text-yellow-400/60'
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
