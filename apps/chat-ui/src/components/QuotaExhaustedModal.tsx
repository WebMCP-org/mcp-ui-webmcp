import { ExternalLink, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';

/**
 * Props for the QuotaExhaustedModal component
 */
interface QuotaExhaustedModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Total amount spent in USD */
  totalSpent: number;
  /** Maximum quota limit in USD */
  quotaLimit: number;
  /** Callback when user chooses to add their own API key */
  onAddApiKey: () => void;
}

/**
 * Modal displayed when user exhausts their free API quota
 *
 * Presents two options to continue using the service:
 * 1. Download the MCP-B extension for unlimited usage
 * 2. Add their own Anthropic API key
 *
 * The modal is non-dismissible (no close button) to ensure
 * users make a choice before continuing.
 *
 * @param props - Component props
 * @returns React component
 *
 * @example
 * ```tsx
 * <QuotaExhaustedModal
 *   open={true}
 *   totalSpent={1.0234}
 *   quotaLimit={1.0}
 *   onAddApiKey={() => openApiKeyDialog()}
 * />
 * ```
 *
 * @see useQuotaExhausted for state management hook
 * @see worker/usageQuota.ts for quota tracking implementation
 */
export function QuotaExhaustedModal({
  open,
  totalSpent,
  quotaLimit,
  onAddApiKey,
}: QuotaExhaustedModalProps) {
  const handleDownloadExtension = () => {
    window.open('https://mcp-b.ai', '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={open}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">You've Used Your Free Credits!</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            You've spent your full ${quotaLimit.toFixed(2)} free quota. To keep chatting, choose one
            of these options:
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer" onClick={handleDownloadExtension}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                  <ExternalLink className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Option 1: Download MCP-B Extension</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Get unlimited AI superpowers and pay me back in good vibes! 😄
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted hover:bg-muted/20 transition-colors cursor-pointer" onClick={onAddApiKey}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-sm mb-1">Option 2: Use My Own API Key</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Bring your own Anthropic API key for unlimited usage
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleDownloadExtension}
            className="w-full sm:flex-1"
            size="lg"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Download MCP-B Extension
          </Button>
          <Button
            onClick={onAddApiKey}
            variant="outline"
            className="w-full sm:flex-1"
            size="lg"
          >
            Add My API Key
          </Button>
        </DialogFooter>

        <div className="text-center pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            You used: <span className="font-semibold">${totalSpent.toFixed(4)}</span> of{' '}
            <span className="font-semibold">${quotaLimit.toFixed(2)}</span>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
