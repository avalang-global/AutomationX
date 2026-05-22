import { t } from 'i18next';
import { ArrowLeft, Search, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';

import { CreateFlowWithAI } from '@/app/components/prompt-to-flow';
import { ProjectDashboardPageHeader } from '@/app/components/project-layout/project-dashboard-page-header';
import { InputWithIcon } from '@/components/custom/input-with-icon';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { TemplateDetailsView } from '@/features/templates/components/template-details-view';
import { useTemplates } from '@/features/templates/hooks/templates-hook';
import { Template, TemplateType } from '@activepieces/shared';
import { AllCategoriesView } from '../templates/all-categories-view';

export const ExplorePage = () => {
  const { filteredTemplates, isLoading, search, setSearch } = useTemplates({
    type: TemplateType.OFFICIAL,
  });
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );

  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, Template[]> = {} as Record<
      string,
      Template[]
    >;

    grouped['All'] = [];

    filteredTemplates.forEach((template: Template) => {
      grouped['All'].push(template);
      if (template.categories?.length) {
        template.categories?.forEach((category: string) => {
          if (!grouped[category]) {
            grouped[category] = [];
          }
          grouped[category].push(template);
        });
      }
    });

    return grouped;
  }, [filteredTemplates]);

  const categories = useMemo(() => {
    return Object.keys(templatesByCategory);
  }, [templatesByCategory]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
  };

  const unselectTemplate = () => {
    setSelectedTemplate(null);
  };

  return (
    <div>
      <ProjectDashboardPageHeader title={t('Explore Templates')} />
      <div>
        <div className="mb-4">
          <CreateFlowWithAI />
        </div>

        <div className="mb-4">
          <InputWithIcon
            icon={<Search className="w-4 h-4" />}
            type="text"
            value={search}
            onChange={handleSearchChange}
            placeholder={t('Search templates')}
          />
        </div>

        {filteredTemplates.length === 0 && (
          <Empty className="min-h-[300px]">
            <EmptyHeader className="max-w-xl">
              <EmptyMedia variant="icon">
                <SearchX />
              </EmptyMedia>
              <EmptyTitle>{t('No templates found')}</EmptyTitle>
              <EmptyDescription>
                {search
                  ? t(
                      'No templates match your search criteria. Try adjusting your search terms.',
                    )
                  : t('No templates are available at the moment.')}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}

        <AllCategoriesView
          templatesByCategory={templatesByCategory}
          categories={categories}
          onCategorySelect={() => {}}
          onTemplateSelect={(template) => {
            setSelectedTemplate(template);
          }}
          isLoading={isLoading}
          hideHeader={true}
        />
      </div>

      <Dialog open={!!selectedTemplate} onOpenChange={unselectTemplate}>
        <DialogContent className="lg:min-w-[850px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex min-h-9 flex-row items-center justify-start gap-2 items-center h-full">
              <Button variant="ghost" size="sm" onClick={unselectTemplate}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
              {t('Template Details')}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <DialogDescription>
              <TemplateDetailsView template={selectedTemplate} />
            </DialogDescription>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
