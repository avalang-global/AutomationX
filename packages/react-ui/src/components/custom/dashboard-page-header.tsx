import { VideoIcon } from 'lucide-react';

import { BetaBadge } from '@/components/custom/beta-badge';

import { Button } from '../ui/button';

import TutorialsDialog, { TabType } from './tutorials-dialog';

export const DashboardPageHeader = ({
  title,
  children,
  description,
  beta = false,
  middleChildren,
  tutorialTab,
}: {
  title: string;
  children?: React.ReactNode;
  description?: React.ReactNode;
  beta?: boolean;
  middleChildren?: React.ReactNode;
  tutorialTab?: TabType;
}) => {
  const className = !!middleChildren
    ? 'grid grid-cols-3'
    : 'flex justify-between';
  return (
    <div className={`w-full ${className} items-center border-b absolute left-0 top-0 bg-background py-3 px-6 z-30`}>
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {tutorialTab && (
            <TutorialsDialog location="table-title" initialTab={tutorialTab}>
              <Button variant="outline-primary" size="icon">
                <VideoIcon className="size-4"></VideoIcon>
              </Button>
            </TutorialsDialog>
          )}
          {beta && (
            <div className="flex items-center">
              <BetaBadge />
            </div>
          )}
        </div>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </div>
      {middleChildren && <div className="flex justify-center">{middleChildren}</div>}
      <div className="flex justify-end">{children}</div>
    </div>
  );
};
