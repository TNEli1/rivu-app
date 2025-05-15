import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function RivuLogo({ className = "", size = 32, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center ${className}`}>
      {/* Logo SVG */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-primary"
      >
        {/* Stylized "R" shape */}
        <path
          d="M30 15C30 10.5817 33.5817 7 38 7H62C73.0457 7 82 15.9543 82 27C82 38.0457 73.0457 47 62 47H55L70 80C70 80 55 84 50 70L40 45H38C33.5817 45 30 41.4183 30 37V15Z"
          stroke="currentColor"
          strokeWidth="5"
          fill="none"
        />
        {/* Moving bar chart to represent financial growth */}
        <rect x="15" y="65" width="10" height="20" rx="2" fill="currentColor" />
        <rect x="35" y="55" width="10" height="30" rx="2" fill="currentColor" />
        <rect x="55" y="45" width="10" height="40" rx="2" fill="currentColor" />
        <rect x="75" y="35" width="10" height="50" rx="2" fill="currentColor" />
      </svg>

      {/* Logo Text */}
      {showText && (
        <h1 className="ml-2 text-2xl font-bold text-foreground">Rivu</h1>
      )}
    </div>
  );
}