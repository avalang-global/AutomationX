import { t } from 'i18next';
import React, { useContext, useRef, useState, useEffect } from 'react'; // May: Added useEffect import

import { Button } from '@/components/ui/button';
import { Dot } from '@/components/ui/dot';
import { todosApi } from '@/features/todos/lib/todos-api';
import {
  FlowAction,
  FlowActionType,
  Step,
  TodoType,
  flowStructureUtil,
  isNil,
  StepRunResponse,
  PopulatedTodo,
  AgentResult,
} from '@activepieces/shared';

import { useBuilderStateContext } from '../builder-hooks';
import { DynamicPropertiesContext } from '../piece-properties/dynamic-properties-context';

import { defaultAgentOutput, isRunAgent } from './agent-test-step';
import { TodoTestingDialog } from './custom-test-step/test-todo-dialog';
import TestWebhookDialog from './custom-test-step/test-webhook-dialog';
import { TestSampleDataViewer } from './test-sample-data-viewer';
import { TestButtonTooltip } from './test-step-tooltip';
import { testStepHooks } from './utils/test-step-hooks';
// May: Import socket hook to check connection status
import { useSocket } from '@/components/socket-provider';

type TestActionComponentProps = {
  isSaving: boolean;
  flowVersionId: string;
  projectId: string;
};

enum DialogType {
  NONE = 'NONE',
  TODO_CREATE_TASK = 'TODO_CREATE_TASK',
  WEBHOOK = 'WEBHOOK',
}

const isTodoCreateTask = (step: FlowAction) => {
  return (
    step.type === FlowActionType.PIECE &&
    step.settings.pieceName === '@activepieces/piece-todos' &&
    step.settings.actionName === 'createTodoAndWait'
  );
};

const isReturnResponseAndWaitForWebhook = (step: FlowAction) => {
  return (
    step.type === FlowActionType.PIECE &&
    step.settings.pieceName === '@activepieces/piece-webhook' &&
    step.settings.actionName === 'return_response_and_wait_for_next_webhook'
  );
};

const TestStepSectionImplementation = React.memo(
  ({
    isSaving,
    currentStep,
  }: TestActionComponentProps & { currentStep: FlowAction }) => {
    const [errorMessage, setErrorMessage] = useState<string | undefined>(
      undefined,
    );
    const [consoleLogs, setConsoleLogs] = useState<null | string>(null);
    const [activeDialog, setActiveDialog] = useState<DialogType>(
      DialogType.NONE,
    );
    const { sampleData, sampleDataInput } = useBuilderStateContext((state) => {
      return {
        sampleData: state.outputSampleData[currentStep.name],
        sampleDataInput: state.inputSampleData[currentStep.name],
      };
    });
    const abortControllerRef = useRef<AbortController>(new AbortController());
    const [mutationKey, setMutationKey] = useState<string[]>([]);
    const [liveAgentResult, setLiveAgentResult] = useState<
      AgentResult | undefined
    >(undefined);
    
    // May: Get socket instance to check connection status
    const socket = useSocket();
    
    // May: State for polling fallback when WebSocket fails
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
    // May: Store todo ID separately to retry fetching even if WebSocket event is lost
    const [pendingTodoId, setPendingTodoId] = useState<string | null>(null);
    
    const { mutate: testAction, isPending: isWatingTestResult } =
      testStepHooks.useTestAction({
        mutationKey,
        currentStep,
        setErrorMessage,
        setConsoleLogs,
        onSuccess: () => {
          setTodo(null);
          setPendingTodoId(null); // May: Clear pending todo ID on success
        },
      });

    const [todo, setTodo] = useState<PopulatedTodo | null>(null);
    const lastTestDate = currentStep.settings.sampleData?.lastTestDate;
    const sampleDataExists = !isNil(lastTestDate) || !isNil(errorMessage);

    // May: Cleanup polling on unmount
    useEffect(() => {
      return () => {
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      };
    }, [pollingInterval]);

    // May: Poll for todo when we have a pending ID but no todo yet
    // This is the fallback when WebSocket events are lost
    useEffect(() => {
      if (pendingTodoId && !todo) {
        console.log('📋 May: Starting polling fallback for todo ID:', pendingTodoId);
        
        let pollCount = 0;
        const interval = setInterval(async () => {
          pollCount++;
          console.log(`📋 May: Polling attempt #${pollCount} for todo:`, pendingTodoId);
          
          try {
            const todoData = await todosApi.get(pendingTodoId);
            if (todoData) {
              console.log('✅ May: Todo found via polling after', pollCount, 'attempts');
              setTodo(todoData);
              setPendingTodoId(null); // May: Clear pending ID once we have the todo
              clearInterval(interval);
              setPollingInterval(null);
            }
          } catch (error) {
            // May: Todo not ready yet, will retry on next interval
            console.log(`📋 May: Polling attempt #${pollCount} failed - todo not ready yet`);
          }
        }, 2000); // May: Poll every 2 seconds

        setPollingInterval(interval);
      }
    }, [pendingTodoId, todo]);

    const handleTodoTest = async () => {
      // May: Log WebSocket connection status for debugging
      console.log('🚀 May: Starting todo test, WebSocket connected:', socket?.connected);
      
      setActiveDialog(DialogType.TODO_CREATE_TASK);
      
      testAction({
        type: 'todoAction',
        onProgress: async (progress: StepRunResponse) => {
          // May: This only runs if WebSocket event arrives
          console.log('📨 May: WebSocket onProgress received:', progress);
          
          if (progress.success) {
            const todoId = getTodoIdFromStepRunResponse(progress);
            console.log('📨 May: Extracted todoId from WebSocket:', todoId);
            
            if (todoId) {
              try {
                // May: Try to fetch immediately
                const todo = await todosApi.get(todoId);
                console.log('✅ May: Todo fetched immediately via WebSocket:', todo);
                setTodo(todo);
              } catch (error) {
                // May: If immediate fetch fails, start polling as fallback
                console.log('⚠️ May: Immediate fetch failed, starting polling fallback for todo:', todoId);
                setPendingTodoId(todoId);
              }
            } else {
              setErrorMessage(
                `${t(`Can't find todo ID in the response`)} ${JSON.stringify(
                  progress.output,
                )}`,
              );
            }
          }
        },
        onFinish: () => {
          console.log('🏁 May: Test action finished');
        },
      });
    };
    
    const handleAgentTest = async () => {
      testAction({
        type: 'agentAction',
        onProgress: async (progress: StepRunResponse) => {
          const outputProgress = progress.output;
          if (!isNil(outputProgress)) {
            setLiveAgentResult(outputProgress as AgentResult);
          }
        },
        onFinish: () => {
          setLiveAgentResult(undefined);
        },
      });
    };

    const onTestButtonClick = async () => {
      if (isTodoCreateTask(currentStep)) {
        handleTodoTest();
      } else if (isRunAgent(currentStep)) {
        setLiveAgentResult(defaultAgentOutput);
        handleAgentTest();
      } else if (isReturnResponseAndWaitForWebhook(currentStep)) {
        setActiveDialog(DialogType.WEBHOOK);
      } else {
        testAction(undefined);
      }
    };

    const handleCloseDialog = () => {
      console.log('❌ May: Closing dialog');
      setActiveDialog(DialogType.NONE);
      setTodo(null);
      setPendingTodoId(null); // May: Clear pending todo ID
      abortControllerRef.current.abort();
      setMutationKey([Date.now().toString()]);
      
      // May: Clear polling interval when dialog closes
      if (pollingInterval) {
        console.log('❌ May: Clearing polling interval');
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
    };

    const isTesting = activeDialog !== DialogType.NONE || isWatingTestResult;
    const { isLoadingDynamicProperties } = useContext(DynamicPropertiesContext);

    return (
      <>
        {!sampleDataExists && (
          <div className="grow flex justify-center items-center w-full h-full">
            <TestButtonTooltip invalid={!currentStep.valid}>
              <Button
                variant="outline"
                size="sm"
                onClick={onTestButtonClick}
                keyboardShortcut="G"
                onKeyboardShortcut={onTestButtonClick}
                loading={isTesting || isSaving}
                disabled={!currentStep.valid || isLoadingDynamicProperties}
              >
                <Dot animation={true} variant={'primary'}></Dot>
                {t('Test Step')}
              </Button>
            </TestButtonTooltip>
          </div>
        )}
        {sampleDataExists && (
          <TestSampleDataViewer
            isValid={currentStep.valid}
            currentStep={currentStep}
            agentResult={liveAgentResult}
            isTesting={isTesting || isLoadingDynamicProperties}
            sampleData={sampleData}
            sampleDataInput={sampleDataInput ?? null}
            errorMessage={errorMessage}
            lastTestDate={lastTestDate}
            consoleLogs={
              currentStep.type === FlowActionType.CODE ? consoleLogs : null
            }
            isSaving={isSaving}
            onRetest={onTestButtonClick}
          ></TestSampleDataViewer>
        )}
        {activeDialog === DialogType.TODO_CREATE_TASK &&
          currentStep.type === FlowActionType.PIECE &&
          todo && (
            <TodoTestingDialog
              open={true}
              key={todo.id}
              onOpenChange={(open) => {
                if (!open) {
                  handleCloseDialog();
                }
              }}
              todo={todo}
              currentStep={currentStep}
              setErrorMessage={setErrorMessage}
              type={
                currentStep.settings.actionName === 'createTodoAndWait'
                  ? TodoType.INTERNAL
                  : TodoType.EXTERNAL
              }
            />
          )}
        {activeDialog === DialogType.WEBHOOK && (
          <TestWebhookDialog
            testingMode="returnResponseAndWaitForNextWebhook"
            open={true}
            onOpenChange={(open) => !open && handleCloseDialog()}
            currentStep={currentStep}
          />
        )}
      </>
    );
  },
);

const isAction = (step: Step): step is FlowAction => {
  return flowStructureUtil.isAction(step.type);
};
const TestActionSection = React.memo((props: TestActionComponentProps) => {
  const currentStep = useBuilderStateContext((state) =>
    state.selectedStep
      ? flowStructureUtil.getStep(state.selectedStep, state.flowVersion.trigger)
      : null,
  );
  if (isNil(currentStep) || !isAction(currentStep)) {
    return null;
  }

  return <TestStepSectionImplementation {...props} currentStep={currentStep} />;
});

TestStepSectionImplementation.displayName = 'TestStepSectionImplementation';
TestActionSection.displayName = 'TestActionSection';

export { TestActionSection };
const getTodoIdFromStepRunResponse = (stepRunResponse: StepRunResponse) => {
  if (
    stepRunResponse.output &&
    typeof stepRunResponse.output === 'object' &&
    'id' in stepRunResponse.output &&
    typeof stepRunResponse.output.id === 'string'
  ) {
    return stepRunResponse.output.id;
  }
  return null;
};