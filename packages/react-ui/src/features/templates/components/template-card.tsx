import { useMutation } from '@tanstack/react-query';
import { t } from 'i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { flowsApi } from '@/features/flows/lib/flows-api';
import { foldersApi } from '@/features/folders/lib/folders-api';
import { PieceIconList } from '@/features/pieces/components/piece-icon-list';
import { authenticationSession } from '@/lib/authentication-session';
import {
  FlowOperationType,
  PopulatedFlow,
  Template,
  UncategorizedFolderId,
  isNil,
} from '@activepieces/shared';

import { templatesApi } from '../lib/templates-api';
import { Card } from '@/components/ui/card';

type TemplateCardProps = {
  template: Template;
  onSelectTemplate: (template: Template) => void;
  folderId?: string;
};

export const TemplateCard = ({
  template,
  onSelectTemplate,
  folderId,
}: TemplateCardProps) => {
  const navigate = useNavigate();

  const { mutate: createFlow, isPending } = useMutation<
    PopulatedFlow[],
    Error,
    Template
  >({
    mutationFn: async (template: Template) => {
      const folder =
        !isNil(folderId) && folderId !== UncategorizedFolderId
          ? await foldersApi.get(folderId)
          : undefined;

      const flowImportPromises = (template.flows || []).map(
        async (templateFlow) => {
          const newFlow = await flowsApi.create({
            displayName: templateFlow.displayName,
            projectId: authenticationSession.getProjectId()!,
            folderName: folder?.displayName,
          });
          return await flowsApi.update(newFlow.id, {
            type: FlowOperationType.IMPORT_FLOW,
            request: {
              displayName: templateFlow.displayName,
              trigger: templateFlow.trigger,
              schemaVersion: templateFlow.schemaVersion,
            },
          });
        },
      );

      return Promise.all(flowImportPromises);
    },
    onSuccess: (flows) => {
      templatesApi.incrementUsageCount(template.id);
      navigate(`/flows/${flows[0].id}`);
    },
  });

  return (
    <Card
      key={template.id}
      variant={'interactive'}
      className="h-[250px] w-full flex flex-col"
      onClick={() => onSelectTemplate(template)}
    >
      <div className="flex items-center gap-2 p-4">
        <PieceIconList
          trigger={template.flows![0].trigger}
          maxNumberOfIconsToShow={2}
        />
      </div>
      <div className="text-sm font-medium line-clamp-2 px-4 min-h-12">
        {template.name}
      </div>
      <p className="text-muted-foreground text-sm line-clamp-3 px-4">
        {template.summary ? (
          template.summary
        ) : (
          <span className="italic">{t('No summary')}</span>
        )}
      </p>
      <div className="py-2 px-4 gap-1 flex items-center">
        <Button
          variant="outline"
          loading={isPending}
          className="px-2 h-8"
          onClick={() => createFlow(template)}
        >
          {t('Use Template')}
        </Button>
      </div>
    </Card>
  );
};
