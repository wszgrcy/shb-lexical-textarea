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
