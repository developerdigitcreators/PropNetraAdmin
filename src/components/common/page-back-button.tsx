'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PageBackButtonProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
  className?: string;
};

/** Shared Back control for admin screens (history, parent href, or custom handler). */
export function PageBackButton({
  href,
  onClick,
  label = 'Back',
  className,
}: PageBackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      router.push(href);
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={handleClick}
      className={cn('text-gray-500 hover:text-gray-900 -ml-2 h-8 px-2', className)}
    >
      <ArrowLeft className="w-4 h-4 mr-1.5" />
      {label}
    </Button>
  );
}
