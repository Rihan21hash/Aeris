import React from 'react';

interface AerisLogoProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const AerisLogo: React.FC<AerisLogoProps> = ({ size = 32, className = '', style = {} }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      <defs>
        <linearGradient id="aeris-air-gradient" x1="95" y1="110" x2="410" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#285B50" />
          <stop offset="1" stopColor="#4C8876" />
        </linearGradient>
      </defs>

      <path
        d="M256 72
           C153 72 72 153 72 256
           C72 359 153 440 256 440
           C332 440 398 394 425 326"
        stroke="url(#aeris-air-gradient)"
        strokeWidth="28"
        strokeLinecap="round"
      />

      <path
        d="M105 250
           C151 250 166 190 218 190
           C266 190 278 250 326 250
           C355 250 374 231 405 211"
        stroke="#285B50"
        strokeWidth="25"
        strokeLinecap="round"
      />

      <path
        d="M105 315
           C153 315 174 267 218 267
           C263 267 281 315 326 315
           C351 315 372 302 394 286"
        stroke="#4C8876"
        strokeWidth="22"
        strokeLinecap="round"
      />

      <circle cx="405" cy="211" r="13" fill="#285B50" />
      <circle cx="394" cy="286" r="11" fill="#4C8876" />
    </svg>
  );
};
