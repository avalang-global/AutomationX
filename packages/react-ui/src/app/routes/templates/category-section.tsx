import { Template } from '@activepieces/shared';
import { t } from 'i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { TemplateCard } from '@/features/templates/components/template-card';

type CategorySectionProps = {
  category: string;
  templates: Template[];
  onCategorySelect: (category: string) => void;
  onTemplateSelect: (template: Template) => void;
};

export const CategorySection = React.memo(
  ({
    category,
    templates,
    onCategorySelect,
    onTemplateSelect,
  }: CategorySectionProps) => {
    if (!templates || templates.length === 0) return null;

    return (
      <div className="space-y-4">
        <Carousel
          opts={{
            align: 'start',
            loop: false,
            slidesToScroll: 'auto',
          }}
          className="w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium">{category}</h2>
            <div className="flex items-center">
              {/*todo(Rupal): button is hidden since we don't have a way to display all templates of a category on demand*/}
              <Button
                variant="ghost"
                onClick={() => onCategorySelect(category)}
                className="flex items-center hidden"
              >
                {t('View all')}
              </Button>
              <div className="flex items-center">
                <CarouselPrevious
                  variant="ghost"
                  className="static translate-y-0 h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </CarouselPrevious>
                <CarouselNext
                  variant="ghost"
                  className="static translate-y-0 h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </CarouselNext>
              </div>
            </div>
          </div>

          <CarouselContent className="pb-3">
            {templates.map((template) => (
              <CarouselItem
                key={template.id}
                className="basis-full sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 min-w-[320px]"
              >
                <TemplateCard
                  template={template}
                  onSelectTemplate={onTemplateSelect}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    );
  },
);

CategorySection.displayName = 'CategorySection';
