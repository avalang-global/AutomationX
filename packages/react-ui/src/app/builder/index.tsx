import { useEffect, useRef, useState } from 'react';

import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import { DataSelector } from '@/app/builder/data-selector';
import { CanvasControls } from '@/app/builder/flow-canvas/canvas-controls';
import { StepSettingsProvider } from '@/app/builder/step-settings/step-settings-context';
import { ChatDrawer } from '@/app/routes/chat/chat-drawer';
import { ShowPoweredBy } from '@/components/show-powered-by';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable-panel';
import { piecesHooks } from '@/features/pieces/lib/pieces-hooks';
import { platformHooks } from '@/hooks/platform-hooks';
import { RightSideBarType } from '@/lib/types';
import {
  promptFlowApi,
  PromptMessage,
} from '@/features/flows/lib/prompt-to-flow-api';
import {
  ApFlagId,
  FlowAction,
  FlowActionType,
  FlowTrigger,
  FlowTriggerType,
  FlowVersionState,
  flowStructureUtil,
  isNil,
} from '@activepieces/shared';

import {
  cn,
  NEW_FLOW_WITH_AI_QUERY_PARAM,
  useElementSize,
} from '../../lib/utils';

import { BuilderHeader } from './builder-header/builder-header';
import { FlowCanvas } from './flow-canvas';
import { flowCanvasHooks } from './flow-canvas/hooks';
import { flowCanvasConsts } from './flow-canvas/utils/consts';
import PublishFlowReminderWidget from './flow-canvas/widgets/publish-flow-reminder-widget';
import { RunInfoWidget } from './flow-canvas/widgets/run-info-widget';
import { ViewingOldVersionWidget } from './flow-canvas/widgets/viewing-old-version-widget';
import { FlowVersionsList } from './flow-versions';
import { RunsList } from './run-list';
import { CursorPositionProvider } from './state/cursor-position-context';
import { StepSettingsContainer } from './step-settings';
import { PromptToFlowSidebar } from './prompt-to-flow';
import { ResizableVerticalPanelsProvider } from './step-settings/resizable-vertical-panels-context';
import { flagsHooks } from '@/hooks/flags-hooks';
import { useLocation } from 'react-router-dom';
const minWidthOfSidebar = 'min-w-[max(20vw,400px)]';
const animateResizeClassName = `transition-all `;

const BuilderPage = () => {
  const location = useLocation();
  const { platform } = platformHooks.useCurrentPlatform();
  const [creditUsage, setCreditUsage] = useState(0);
  const [flowVersion, rightSidebar, setRightSidebar, selectedStep, flow] =
    useBuilderStateContext((state) => [
      state.flowVersion,
      state.rightSidebar,
      state.setRightSidebar,
      state.selectedStep,
      state.flow,
    ]);
  flowCanvasHooks.useShowBuilderIsSavingWarningBeforeLeaving();

  const { data: ZERO_API_URL } = flagsHooks.useFlag<string>(
    ApFlagId.ZERO_SERVICE_URL,
  );
  const reloadCreditUsage = () => {
    if (!ZERO_API_URL || !flow?.id) {
      return;
    }
    promptFlowApi
      .getCreditUsage(ZERO_API_URL, flow.projectId, flow.id)
      .then((creditUsage) => {
        setCreditUsage(creditUsage);
      })
      .catch((error) => {
        console.error('Failed to reload credit usage', error);
      });
  };

  useEffect(() => {
    reloadCreditUsage();
  }, [ZERO_API_URL, flow?.id]);

  const { memorizedSelectedStep } = useBuilderStateContext((state) => {
    const flowVersion = state.flowVersion;
    if (isNil(state.selectedStep) || isNil(flowVersion)) {
      return {
        memorizedSelectedStep: undefined,
      };
    }
    const step = flowStructureUtil.getStep(
      state.selectedStep,
      flowVersion.trigger,
    );
    return {
      memorizedSelectedStep: step,
    };
  });
  const middlePanelRef = useRef<HTMLDivElement>(null);
  const middlePanelSize = useElementSize(middlePanelRef);
  const [isDraggingHandle, setIsDraggingHandle] = useState(false);
  const rightHandleRef = flowCanvasHooks.useAnimateSidebar(rightSidebar);
  const rightSidePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.search.includes(NEW_FLOW_WITH_AI_QUERY_PARAM)) {
      setRightSidebar(RightSideBarType.PROMPT_TO_FLOW);
    }
  }, [location.search]);

  const { pieceModel, refetch: refetchPiece } =
    piecesHooks.usePieceModelForStepSettings({
      name: memorizedSelectedStep?.settings.pieceName,
      version: memorizedSelectedStep?.settings.pieceVersion,
      enabled:
        memorizedSelectedStep?.type === FlowActionType.PIECE ||
        memorizedSelectedStep?.type === FlowTriggerType.PIECE,
      getExactVersion: flowVersion.state === FlowVersionState.LOCKED,
    });
  flowCanvasHooks.useSetSocketListener(refetchPiece);
  const [hasCanvasBeenInitialised, setHasCanvasBeenInitialised] =
    useState(false);

  return (
    <div className="flex h-full w-full flex-col relative">
      <div className="z-50">
        <BuilderHeader creditUsage={creditUsage} />
      </div>
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={100} order={2} id="flow-canvas">
          <div ref={middlePanelRef} className="relative h-full w-full">
            <CursorPositionProvider>
              <FlowCanvas
                setHasCanvasBeenInitialised={setHasCanvasBeenInitialised}
              ></FlowCanvas>
            </CursorPositionProvider>

            <PublishFlowReminderWidget />
            <RunInfoWidget />
            <ViewingOldVersionWidget />
            {middlePanelRef.current &&
              middlePanelRef.current.clientWidth > 0 && (
                <CanvasControls
                  canvasHeight={middlePanelRef.current?.clientHeight ?? 0}
                  canvasWidth={middlePanelRef.current?.clientWidth ?? 0}
                  hasCanvasBeenInitialised={hasCanvasBeenInitialised}
                  selectedStep={selectedStep}
                ></CanvasControls>
              )}

            <ShowPoweredBy
              position="absolute"
              show={platform?.plan.showPoweredBy}
            />
            <DataSelector
              parentHeight={middlePanelSize.height}
              parentWidth={middlePanelSize.width}
            ></DataSelector>
          </div>
        </ResizablePanel>

        <ResizableHandle
          disabled={rightSidebar === RightSideBarType.NONE}
          withHandle={rightSidebar !== RightSideBarType.NONE}
          onDragging={setIsDraggingHandle}
          className={
            rightSidebar === RightSideBarType.NONE ? 'bg-transparent' : ''
          }
        />

        <ResizablePanel
          ref={rightHandleRef}
          id="right-sidebar"
          defaultSize={0}
          minSize={0}
          maxSize={60}
          order={3}
          className={cn('min-w-0 bg-background z-30', {
            [minWidthOfSidebar]: rightSidebar !== RightSideBarType.NONE,
            [animateResizeClassName]: !isDraggingHandle,
          })}
          style={{
            transitionDuration: `${
              isDraggingHandle ? 0 : flowCanvasConsts.SIDEBAR_ANIMATION_DURATION
            }ms`,
          }}
        >
          <div ref={rightSidePanelRef} className="h-full w-full">
            {rightSidebar === RightSideBarType.PIECE_SETTINGS &&
              memorizedSelectedStep && (
                <ResizableVerticalPanelsProvider>
                  <StepSettingsProvider
                    pieceModel={pieceModel}
                    selectedStep={memorizedSelectedStep}
                    key={constructContainerKey({
                      flowVersionId: flowVersion.id,
                      step: memorizedSelectedStep,
                      hasPieceModelLoaded: !!pieceModel,
                    })}
                  >
                    <StepSettingsContainer />
                  </StepSettingsProvider>
                </ResizableVerticalPanelsProvider>
              )}
            {rightSidebar === RightSideBarType.RUNS && <RunsList />}
            {rightSidebar === RightSideBarType.VERSIONS && <FlowVersionsList />}
            {rightSidebar === RightSideBarType.PROMPT_TO_FLOW && (
              <PromptToFlowSidebar
                onShouldReloadCreditUsage={reloadCreditUsage}
              />
            )}
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>

      <ChatDrawer />
    </div>
  );
};

BuilderPage.displayName = 'BuilderPage';
export { BuilderPage };

function constructContainerKey({
  flowVersionId,
  step,
  hasPieceModelLoaded,
}: {
  flowVersionId: string;
  step?: FlowAction | FlowTrigger;
  hasPieceModelLoaded: boolean;
}) {
  const stepName = step?.name;
  const triggerOrActionName =
    step?.type === FlowTriggerType.PIECE
      ? step?.settings.triggerName
      : step?.settings.actionName;
  const pieceName =
    step?.type === FlowTriggerType.PIECE || step?.type === FlowActionType.PIECE
      ? step?.settings.pieceName
      : undefined;
  //we need to re-render the step settings form when the step is skipped, so when the user edits the settings after setting it to skipped the changes are reflected in the update request
  const isSkipped =
    step?.type != FlowTriggerType.EMPTY &&
    step?.type != FlowTriggerType.PIECE &&
    step?.skip;
  return `${flowVersionId}-${stepName ?? ''}-${triggerOrActionName ?? ''}-${
    pieceName ?? ''
  }-${'skipped-' + !!isSkipped}-${
    hasPieceModelLoaded ? 'loaded' : 'not-loaded'
  }`;
}
