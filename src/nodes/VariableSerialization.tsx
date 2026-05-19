import type {
  LexicalNode,
  SerializedEditorState,
  SerializedLexicalNode,
} from 'lexical';

/**
 * Configuration options for custom node type handlers.
 */
export interface PlainTextOptions {
  /**
   * Custom handler for VariableNode types.
   * @param node - The VariableNode to process
   * @returns The string representation of the variable node
   */
  onVariableNode?: (node: LexicalNode) => string;
  /**
   * Custom handler for regular TextNode types.
   * @param node - The TextNode to process
   * @returns The string representation of the text node
   */
  onTextNode?: (node: LexicalNode) => string;
  /**
   * Custom handler for ElementNode types (block elements).
   * @param node - The ElementNode to process
   * @param childrenText - The concatenated text from all child nodes
   * @returns The string representation of the element node
   */
  onElementNode?: (node: LexicalNode, childrenText: string) => string;
}

/**
 * Represents a found variable node in the serialized state.
 */
export interface FoundVariable {
  /** The variable's label */
  label: string;
  /** The variable's value array */
  value: (number | string)[];
  /** The variable's type, if present */
  type?: string;
}

/**
 * Signature for a custom variable resolver function.
 * Receives the serialized VariableItem (with its `type`, `label`, and `value`)
 * and returns the string to use as the resolved output.
 */
export type VariableResolver = (item: {
  label: string;
  value: (number | string)[];
  type?: string;
}) => string;

/**
 * Serialize a Lexical JSON state to a plain string by applying a custom variable resolver.
 *
 * The resolver receives each VariableNode's item (`{ label, value, type? }`) and returns
 * the resolved string. This gives developers full control over how variables are rendered,
 * including type-aware resolution, context lookups, or custom formatting.
 *
 * @param state - The Lexical JSON state object (as emitted by onChange or as value/defaultValue).
 * @param resolver - A function that receives a VariableItem and returns its resolved string.
 * @returns The resolved plain text string with all variables substituted.
 */
export function serializeTemplate(
  state: SerializedEditorState<SerializedLexicalNode>,
  resolver: VariableResolver,
): string {
  let result = '';

  const rootData = (state as any).root;
  if (!rootData || !Array.isArray(rootData.children)) return '';

  for (const childData of rootData.children) {
    if (typeof childData !== 'object' || childData === null) continue;
    result += serializeNode(childData, resolver);
  }

  return result;
}

/**
 * Find all variable nodes of type 'custom' in a serialized Lexical state.
 *
 * @param state - The serialized Lexical editor state.
 * @returns An array of found custom variable nodes.
 */
export function findCustomVariables(
  state: SerializedEditorState<SerializedLexicalNode>,
): FoundVariable[] {
  const results: FoundVariable[] = [];

  const rootData = (state as any).root;
  if (!rootData || !Array.isArray(rootData.children)) return results;

  for (const childData of rootData.children) {
    if (typeof childData !== 'object' || childData === null) continue;
    findCustomVariablesInNode(childData, results);
  }

  return results;
}

/**
 * Recursively search for custom variable nodes within a serialized node.
 */
function findCustomVariablesInNode(
  node: { [key: string]: unknown },
  results: FoundVariable[],
): void {
  if (!node || typeof node !== 'object') return;

  const type = node.type as string;

  // Check if this is a VariableNode with type === 'custom'
  if (type === 'variable' && node.item) {
    const item = node.item as { label: string; value: (number | string)[]; type?: string };
    if (item.type === 'custom') {
      results.push({
        label: item.label,
        value: item.value,
        type: item.type,
      });
    }
  }

  // Recurse into children for ElementNode or Root
  const children = Array.isArray(node.children) ? node.children : (node as any).children;
  if (Array.isArray(children)) {
    for (const child of children) {
      findCustomVariablesInNode(child as { [key: string]: unknown }, results);
    }
  }
}

/**
 * Recursively serialize a serialized Lexical node to string.
 */
function serializeNode(
  node: { [key: string]: unknown },
  resolver: VariableResolver,
): string {
  if (!node || typeof node !== 'object') return '';

  const type = node.type as string;

  // VariableNode: use the custom resolver
  if (type === 'variable' && node.item) {
    const item = node.item as { label: string; value: (number | string)[] };
    return resolver(item);
  }

  // TextNode
  if (type === 'text' && typeof node.text === 'string') {
    return node.text;
  }

  // ElementNode (e.g., paragraph): serialize children + add newline
  if (Array.isArray(node.children)) {
    let result = '';
    for (const child of node.children) {
      result += serializeNode(child as { [key: string]: unknown }, resolver);
    }
    if (type !== 'root') {
      result += '\n';
    }
    return result;
  }

  // Root or other: try to recurse into children
  if (Array.isArray((node as any).children)) {
    let result = '';
    for (const child of (node as any).children) {
      result += serializeNode(child as { [key: string]: unknown }, resolver);
    }
    return result;
  }

  return '';
}
