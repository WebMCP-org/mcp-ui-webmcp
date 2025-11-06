import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle } from 'lucide-react';
import { useEffect, useId } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getStoredApiKey, getStoredServerUrl, setStoredApiKey } from '@/lib/storage';
import { type SettingsFormData, settingsFormSchema } from '@/lib/validation';
import { ServerSettings } from './ServerSettings';

interface ApiKeyInputProps {
  open: boolean;
  onClose: () => void;
  onConnectServer: (url: string) => Promise<void>;
  onDisconnectServer: () => Promise<void>;
  connectionState: 'disconnected' | 'connecting' | 'loading' | 'ready' | 'failed';
}

export function ApiKeyInput({
  open,
  onClose,
  onConnectServer,
  onDisconnectServer,
  connectionState,
}: ApiKeyInputProps) {
  const apiKeyId = useId();

  const form = useForm<SettingsFormData>({
    // @ts-expect-error zodResolver type issue
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      apiKey: getStoredApiKey(),
      serverUrl: getStoredServerUrl(),
    },
    mode: 'onChange', // Validate on change for real-time feedback
  });

  useEffect(() => {
    if (open) {
      form.reset({
        apiKey: getStoredApiKey(),
        serverUrl: getStoredServerUrl(),
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (connectionState === 'ready' && open) {
      onClose();
    }
  }, [connectionState, open, onClose]);

  const onSubmit = async (data: SettingsFormData) => {
    try {
      setStoredApiKey(data.apiKey);

      await onConnectServer(data.serverUrl);
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleClose = () => {
    if (connectionState === 'ready') {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent showCloseButton={false} className="max-w-2xl sm:p-6 p-4">
        <FormProvider {...form}>
          {/* @ts-expect-error close enough */}
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader className="sm:space-y-1.5 space-y-1">
              <DialogTitle className="sm:text-lg text-base">Settings</DialogTitle>
              <DialogDescription className="sm:text-sm text-xs">
                Configure your MCP server connection. Optionally add your Anthropic API key for
                unlimited usage.
              </DialogDescription>
            </DialogHeader>

            {/* Connection Status Banner */}
            {(connectionState === 'disconnected' || connectionState === 'failed') && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 sm:p-3 p-2 sm:mt-4 mt-2">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                  <p className="sm:text-sm text-xs font-medium text-yellow-700 dark:text-yellow-400">
                    {connectionState === 'failed'
                      ? 'Connection failed. Please check your server URL and try again.'
                      : 'Please configure your MCP server to start chatting.'}
                  </p>
                </div>
              </div>
            )}

            <div className="sm:space-y-6 space-y-3 sm:mt-4 mt-2">
              {/* API Key Section */}
              <div className="sm:space-y-2 space-y-1.5">
                <div className="flex items-center gap-2">
                  <label htmlFor={apiKeyId} className="sm:text-sm text-xs font-medium">
                    Anthropic API Key <span className="text-muted-foreground">(Optional)</span>
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p className="text-xs">
                          Without an API key, you get $1.00 of free usage. Add your own API key from{' '}
                          <a
                            href="https://console.anthropic.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline"
                          >
                            console.anthropic.com
                          </a>{' '}
                          for unlimited usage. Your key is stored locally and never sent to our
                          servers.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <input
                  id={apiKeyId}
                  type="password"
                  placeholder="sk-ant-..."
                  {...form.register('apiKey')}
                  className="flex sm:h-9 h-8 w-full rounded-md border border-input bg-background sm:px-3 px-2 py-1 sm:text-base text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  autoComplete="off"
                  autoFocus
                />
                {form.formState.errors.apiKey && (
                  <p className="sm:text-sm text-xs text-destructive">{form.formState.errors.apiKey.message}</p>
                )}
                <p className="text-xs text-muted-foreground sm:block hidden">
                  Leave empty to use free quota ($1.00 limit). Add your own key for unlimited usage.
                  Keys are stored locally in your browser.
                </p>
              </div>

              <Separator className="sm:my-6 my-3" />

              {/* Server Settings Section */}
              <ServerSettings
                onConnect={onConnectServer}
                onDisconnect={onDisconnectServer}
                connectionState={connectionState}
              />
            </div>

            <DialogFooter className="sm:mt-6 mt-4 sm:gap-2 gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        variant="outline"
                        type="button"
                        onClick={handleClose}
                        disabled={connectionState !== 'ready'}
                        className="sm:h-10 h-8 sm:px-4 px-3 sm:text-sm text-xs"
                      >
                        Close
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {connectionState !== 'ready' && (
                    <TooltipContent>
                      <p className="text-xs">Connect to MCP server before closing</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      disabled={
                        !form.formState.isValid ||
                        connectionState === 'connecting' ||
                        connectionState === 'loading'
                      }
                      className="sm:h-10 h-8 sm:px-4 px-3 sm:text-sm text-xs"
                    >
                      {connectionState === 'connecting' || connectionState === 'loading'
                        ? 'Connecting...'
                        : 'Save & Connect'}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Save settings and connect to MCP server</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
