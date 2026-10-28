import React from 'react';

export function UzcardIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#0047BA" />
      <circle cx="48" cy="37.5" r="22" fill="#00A3E0" fillOpacity="0.8" />
      <circle cx="72" cy="37.5" r="22" fill="#FFFFFF" fillOpacity="0.8" />
      <text x="60" y="44" fontFamily="sans-serif" fontSize="18" fontWeight="bold" fill="#003087" textAnchor="middle">
        UZ
      </text>
    </svg>
  );
}

export function HumoIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#E6A117" />
      <circle cx="60" cy="37.5" r="24" fill="#FFFFFF" fillOpacity="0.2" />
      <path
        d="M40 50L55 24H65L50 50H40ZM65 50L80 24H70L55 50H65Z"
        fill="#FFFFFF"
      />
      <text x="60" y="66" fontFamily="sans-serif" fontSize="10" fontWeight="bold" fill="#FFFFFF" textAnchor="middle" letterSpacing="2">
        HUMO
      </text>
    </svg>
  );
}

export function ClickIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#0073FF" />
      <circle cx="46" cy="37.5" r="16" fill="#FFFFFF" />
      <path d="M46 29V46L58 37.5L46 29Z" fill="#0073FF" />
      <text x="82" y="44" fontFamily="sans-serif" fontSize="16" fontWeight="bold" fill="#FFFFFF">
        click
      </text>
    </svg>
  );
}

export function PaymeIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#00CCCC" />
      <text x="60" y="45" fontFamily="sans-serif" fontSize="18" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        payme
      </text>
    </svg>
  );
}

export function UzumIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#7000FF" />
      <text x="60" y="44" fontFamily="sans-serif" fontSize="16" fontWeight="bold" fill="#FFFFFF" textAnchor="middle">
        uzum
      </text>
    </svg>
  );
}

export function VisaIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#1A1F71" />
      <text x="60" y="47" fontFamily="sans-serif" fontStyle="italic" fontSize="24" fontWeight="900" fill="#F7B600" textAnchor="middle">
        VISA
      </text>
    </svg>
  );
}

export function MastercardIcon({ className = 'h-6 w-auto' }) {
  return (
    <svg className={className} viewBox="0 0 120 75" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="75" rx="10" fill="#222222" />
      <circle cx="48" cy="37.5" r="18" fill="#EB001B" />
      <circle cx="72" cy="37.5" r="18" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}
