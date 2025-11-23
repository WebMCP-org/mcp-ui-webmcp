/**
 * Rich Elicitation Protocol Type Definitions
 *
 * These types extend the MCP Elicitation Protocol to support UI delegation.
 * This enables servers to request structured input via custom UI components.
 */

/**
 * UI delegation configuration for elicitation
 */
export interface ElicitationUI {
  /**
   * URI of the UI resource to render (e.g., "ui://color-picker")
   */
  uri: string;

  /**
   * Optional rendering mode hint for the Host
   * - "modal": Display in a modal dialog
   * - "inline": Display inline with the conversation
   * - "sidebar": Display in a sidebar panel
   */
  mode?: 'modal' | 'inline' | 'sidebar';

  /**
   * Optional context data passed to the Guest UI
   * This can include:
   * - Error messages from previous validation failures
   * - Default or prefilled values
   * - Theme preferences
   * - Any other contextual information
   */
  context?: Record<string, unknown>;
}

/**
 * Extended elicitation request parameters
 * Extends the standard MCP elicitation/create with UI delegation
 */
export interface ElicitationCreateParams {
  /**
   * Human-readable message explaining what input is needed
   */
  message: string;

  /**
   * JSON Schema defining the expected structure of the response
   */
  requestedSchema: {
    type: string;
    properties?: Record<string, unknown>;
    required?: string[];
    [key: string]: unknown;
  };

  /**
   * UI delegation configuration
   * If provided, Host should render the specified UI resource
   * instead of using a generic input form
   */
  ui?: ElicitationUI;
}

/**
 * Elicitation context notification sent from Host to Guest UI
 * Method: ui/notifications/elicitation-context
 */
export interface ElicitationContextNotification {
  jsonrpc: '2.0';
  method: 'ui/notifications/elicitation-context';
  params: {
    /**
     * Message from the elicitation request
     */
    message: string;

    /**
     * JSON Schema from the elicitation request
     */
    schema: ElicitationCreateParams['requestedSchema'];

    /**
     * Optional context data from ui.context
     */
    context?: Record<string, unknown>;
  };
}

/**
 * Submission from Guest UI to Host
 * Method: ui/submit-elicitation
 */
export interface ElicitationSubmission {
  jsonrpc: '2.0';
  method: 'ui/submit-elicitation';
  params: {
    /**
     * User's action
     * - "accept": User submitted valid data
     * - "decline": User explicitly declined to provide data
     * - "cancel": User cancelled the operation
     */
    action: 'accept' | 'decline' | 'cancel';

    /**
     * Submitted data (must match requestedSchema if action is "accept")
     * null for "decline" or "cancel"
     */
    content: Record<string, unknown> | null;
  };
}

/**
 * Elicitation result sent from Host to Server
 * This is the final result after Host validates the submission
 */
export interface ElicitationResult {
  /**
   * User's action
   */
  action: 'accept' | 'decline' | 'cancel';

  /**
   * Validated content (guaranteed to match requestedSchema if action is "accept")
   */
  content?: Record<string, unknown>;
}
