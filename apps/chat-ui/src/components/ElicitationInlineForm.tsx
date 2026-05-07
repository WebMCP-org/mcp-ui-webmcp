import { Button } from "@/components/ui/button";
import { withTheme } from "@rjsf/core";
import { Theme as shadcnTheme } from "@rjsf/shadcn";
import validator from "@rjsf/validator-ajv8";
import { ExternalLink } from "lucide-react";

const Form = withTheme(shadcnTheme);

export interface ElicitationRequest {
  params: {
    mode?: 'form' | 'url';
    message?: string;
    requestedSchema?: Record<string, unknown>;
    url?: string;
    elicitationId?: string;
  };
}

interface ElicitationInlineFormProps {
  request: ElicitationRequest;
  onSubmit: (result: { action: 'accept' | 'decline' | 'cancel'; data?: unknown }) => void;
  onCancel: () => void;
}

export function ElicitationInlineForm({ request, onSubmit, onCancel }: ElicitationInlineFormProps) {
  const { mode = 'form', message, requestedSchema, url } = request.params;

  return (
    <div className="mt-2 space-y-3 border-t pt-3">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">
          {mode === 'url' ? 'Action Required' : 'Input Required'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {message || "The server requires additional information."}
        </p>
      </div>

      {mode === 'form' && requestedSchema && (
        <Form
          schema={requestedSchema}
          validator={validator}
          onSubmit={({ formData }) => onSubmit({ action: 'accept', data: formData })}
          className="space-y-3"
        >
          <div className="flex justify-end gap-2 mt-3">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Submit
            </Button>
          </div>
        </Form>
      )}

      {mode === 'url' && url && (
        <div className="space-y-3">
          <div className="break-all">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline text-sm"
            >
              {url} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => onSubmit({ action: 'accept' })}>
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
