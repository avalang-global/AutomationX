import { ArrowUpIcon, LoaderCircle } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { ResizableTextareaProps, Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface PromptInputProps
  extends Omit<ResizableTextareaProps, 'onChange' | 'onSubmit' | 'value' | 'placeholder'> {
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  icon?: Boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

export const PromptInput = React.forwardRef<HTMLTextAreaElement, PromptInputProps>(
  (
    {
      value,
      placeholder,
      onChange,
      onSubmit,
      disabled = false,
      className,
      maxRows = 6,
      minRows = 4,
      icon = false,
      loading = false,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<string>(value ?? '');

    React.useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);

    const currentValue = value !== undefined ? value : internalValue;

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      if (value === undefined) {
        setInternalValue(next);
      }
      onChange?.(next);
    };

    const handleSubmit = () => {
      if (disabled) return;
      const trimmed = currentValue.trim();
      if (!trimmed) return;
      onSubmit?.(currentValue);
      if (value === undefined) {
        setInternalValue('');
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    };

    return (
      <div className={cn('relative w-full', className)}>
        <Textarea
          ref={ref}
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          minRows={minRows}
          maxRows={maxRows}
          className={cn(
            'resize-none pb-10',
          )}
          {...props}
        />
        <Button
          type="button"
          className="absolute bottom-2 right-2"
          size={icon ? 'icon' : 'default'}
          onClick={handleSubmit}
          disabled={disabled || !currentValue.trim()}
          loading={loading}
        >
          {icon ? <ArrowUpIcon className="w-4 h-4" /> : 'Generate'}
        </Button>
      </div>
    );
  },
);

PromptInput.displayName = 'PromptInput';

export default PromptInput;


