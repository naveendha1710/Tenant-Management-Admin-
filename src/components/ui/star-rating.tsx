import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
  maxRating?: number;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

export function StarRating({ 
  rating, 
  onRatingChange, 
  maxRating = 10, 
  size = 'md',
  disabled = false 
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: maxRating }, (_, index) => {
        const starValue = index + 1;
        const isActive = starValue <= (hoverRating || rating);
        
        return (
          <button
            key={index}
            type="button"
            disabled={disabled}
            className={cn(
              "transition-colors duration-150",
              disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:scale-110"
            )}
            onMouseEnter={() => !disabled && setHoverRating(starValue)}
            onMouseLeave={() => !disabled && setHoverRating(0)}
            onClick={() => !disabled && onRatingChange(starValue)}
          >
            <Star
              className={cn(
                sizeClasses[size],
                isActive 
                  ? "fill-yellow-400 text-yellow-400" 
                  : "fill-gray-200 text-gray-300"
              )}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm font-medium text-gray-600">
        {rating}/10
      </span>
    </div>
  );
}