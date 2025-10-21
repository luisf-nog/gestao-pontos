import { memo, ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface OptimizedCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconClassName?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Memoized card component to prevent unnecessary re-renders
 * Use this for dashboard cards that don't change frequently
 */
export const OptimizedCard = memo(({ 
  title, 
  description, 
  icon: Icon, 
  iconClassName,
  children,
  className 
}: OptimizedCardProps) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {Icon && <Icon className={iconClassName || "h-5 w-5 text-muted-foreground"} />}
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
});

OptimizedCard.displayName = 'OptimizedCard';
