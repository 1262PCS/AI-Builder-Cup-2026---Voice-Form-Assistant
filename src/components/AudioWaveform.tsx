import React from 'react';

interface AudioWaveformProps {
  isActive: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'blue';
  barCount?: number;
  height?: number;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isActive,
  color = 'indigo',
  barCount = 16,
  height = 24,
}) => {
  const colorMap = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    blue: 'bg-blue-500',
  };

  const selectedColor = colorMap[color];

  return (
    <div
      className="flex items-center gap-[3px] justify-center px-2 py-1"
      style={{ height: `${height}px` }}
      aria-label={isActive ? 'Audio active' : 'Audio idle'}
    >
      {Array.from({ length: barCount }).map((_, i) => {
        // Vary heights and animation delays to simulate a realistic audio visualizer
        const heights = [35, 65, 90, 45, 80, 100, 50, 75, 95, 40, 85, 60, 70, 90, 45, 60];
        const baseHeight = isActive ? heights[i % heights.length] : 20;
        const animDelay = (i * 0.08) % 0.8;

        return (
          <span
            key={i}
            className={`w-[3px] rounded-full transition-all duration-150 ${selectedColor} ${
              isActive ? 'animate-pulse' : 'opacity-40'
            }`}
            style={{
              height: isActive ? `${baseHeight}%` : '15%',
              animationDelay: `${animDelay}s`,
              minHeight: '3px',
            }}
          />
        );
      })}
    </div>
  );
};
