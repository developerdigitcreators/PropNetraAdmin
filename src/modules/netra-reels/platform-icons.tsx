type IconProps = { className?: string };

export function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22.5 7.2a3.2 3.2 0 0 0-2.25-2.27C18.4 4.5 12 4.5 12 4.5s-6.4 0-8.25.43A3.2 3.2 0 0 0 1.5 7.2 33.6 33.6 0 0 0 1.1 12a33.6 33.6 0 0 0 .4 4.8 3.2 3.2 0 0 0 2.25 2.27C5.6 19.5 12 19.5 12 19.5s6.4 0 8.25-.43a3.2 3.2 0 0 0 2.25-2.27A33.6 33.6 0 0 0 22.9 12a33.6 33.6 0 0 0-.4-4.8ZM10 15.2V8.8l5.5 3.2L10 15.2Z" />
    </svg>
  );
}
