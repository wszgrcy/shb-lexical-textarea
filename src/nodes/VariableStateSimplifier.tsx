import type {
  SerializedEditorState,
  SerializedLexicalNode,
  SerializedParagraphNode,
  SerializedRootNode,
  SerializedTextNode,
} from 'lexical';
import type { SerializedVariableNode } from './VariableNode';
import type { VariableResolver } from './VariableSerialization';

/**
 * A simplified text node in the flattened state.
 */
export interface SimpleTextNode {
  text: string;
  type: 'text';
}

/**
 * A simplified variable node in the flattened state.
 */
export interface SimpleVariableNode {
  type: 'variable';
  item: {
    label: string;
    value: (number | string)[];
    type?: string;
  };
}

/**
 * A paragraph in the simplified 2D array state.
 * Contains text nodes and variable nodes.
 */
export type SimpleParagraph = Array<SimpleTextNode | SimpleVariableNode>;

/**
 * The simplified 2D array representation of a Lexical editor state.
 * Each sub-array represents one paragraph/line.
 */
export type SimplifiedState = SimpleParagraph[];

/**
 * Check if a node is a simple text node.
 */
function isSimpleTextNode(node: unknown): node is SimpleTextNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as any).type === 'text' &&
    typeof (node as any).text === 'string'
  );
}

/**
 * Check if a node is a simple variable node.
 */
function isSimpleVariableNode(node: unknown): node is SimpleVariableNode {
  return (
    typeof node === 'object' &&
    node !== null &&
    (node as any).type === 'variable' &&
    typeof (node as any).item === 'object' &&
    (node as any).item !== null
  );
}

/**
 * Simplify a SerializedEditorState to a 2D array (paragraph list).
 *
 * Text nodes are represented as: { text: string, type: 'text' }
 * Variable nodes are represented as: { type: 'variable', item: { label, value, type? } }
 *
 * Default values are not included - only essential data is kept.
 *
 * @param state - The Lexical serialized editor state
 * @returns A 2D array representing paragraphs with text and variable nodes
 */
export function simplifyEditorState(
  state: SerializedEditorState<SerializedLexicalNode>,
): SimplifiedState {
  const result: SimplifiedState = [];

  const rootData = state.root;
  if (!rootData || !Array.isArray(rootData.children)) return result;

  for (const paragraph of rootData.children) {
    if (typeof paragraph !== 'object' || paragraph === null) continue;

    const children = (paragraph as SerializedParagraphNode).children;
    if (!Array.isArray(children)) continue;

    const simpleParagraph: SimpleParagraph = [];

    for (const child of children) {
      if (typeof child !== 'object' || child === null) continue;

      const nodeType = (child as any).type;

      if (nodeType === 'text') {
        // Text node: keep only text and type
        const textNode: SimpleTextNode = {
          text: (child as SerializedTextNode).text,
          type: 'text',
        };
        simpleParagraph.push(textNode);
      } else if (nodeType === 'variable') {
        // Variable node: keep only type and item
        const variableNode: SimpleVariableNode = {
          type: 'variable',
          item: (child as SerializedVariableNode).item,
        };
        simpleParagraph.push(variableNode);
      }
      // Other node types are ignored (they use default values)
    }

    result.push(simpleParagraph);
  }

  return result;
}

/**
 * Extract all variable items from a SimplifiedState, grouped by type.
 *
 * @param simplified - The 2D array state to extract from
 * @returns An object with { all, default, custom } arrays of variable item objects
 */
export function extractVariableItems(simplified: SimplifiedState): {
  all: SimpleVariableNode['item'][];
  default: SimpleVariableNode['item'][];
  custom: SimpleVariableNode['item'][];
} {
  const all: SimpleVariableNode['item'][] = [];
  const def: SimpleVariableNode['item'][] = [];
  const cus: SimpleVariableNode['item'][] = [];

  for (const paragraph of simplified) {
    for (const node of paragraph) {
      if (isSimpleVariableNode(node)) {
        all.push(node.item);
        if (node.item.type === 'default') {
          def.push(node.item);
        } else if (node.item.type === 'custom') {
          cus.push(node.item);
        }
      }
    }
  }

  return { all, default: def, custom: cus };
}

/**
 * Restore a SimplifiedState back to a SerializedEditorState.
 *
 * @param simplified - The 2D array state to restore
 * @returns A Lexical serialized editor state
 */
/**
 * Serialize a SimplifiedState to a plain string by applying a custom variable resolver.
 *
 * This is the complement of `simplifyEditorState`: together they are equivalent to
 * `serializeTemplate` from VariableSerialization.tsx.
 *
 * @param simplified - The 2D array state to serialize.
 * @param resolver - A function that resolves each variable node to a string.
 * @returns The serialized plain text string with all variables substituted.
 */
export function serializeSimplifiedState(
  simplified: SimplifiedState,
  resolver: VariableResolver,
): string {
  let result = '';

  for (let i = 0; i < simplified.length; i++) {
    const paragraph = simplified[i];

    for (const node of paragraph) {
      if (isSimpleTextNode(node)) {
        result += node.text;
      } else if (isSimpleVariableNode(node)) {
        result += resolver(node.item);
      }
    }

    // Add newline after each paragraph (except potentially the last one if empty,
    // but we follow serializeTemplate behavior: non-root elements get a newline)
    result += '\n';
  }

  return result;
}

export function restoreEditorState(
  simplified: SimplifiedState,
): SerializedEditorState<SerializedLexicalNode> {
  const paragraphs: SerializedLexicalNode[] = [];

  for (const paragraph of simplified) {
    const children: SerializedLexicalNode[] = [];

    for (const node of paragraph) {
      if (isSimpleTextNode(node)) {
        // Restore text node with default values
        children.push({
          type: 'text',
          version: 1,
          text: node.text,
          detail: 0,
          format: 0,
          mode: 'normal',
          style: '',
        } as SerializedLexicalNode);
      } else if (isSimpleVariableNode(node)) {
        // Restore variable node with default values
        children.push({
          type: 'variable',
          version: 1,
          item: node.item,
        } as SerializedLexicalNode);
      }
    }

    // Only add non-empty paragraphs
    if (children.length > 0) {
      paragraphs.push({
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children,
        textFormat: 0,
        textStyle: '',
      } as SerializedLexicalNode);
    }
  }

  return {
    root: {
      type: 'root',
      version: 1,
      direction: null,
      format: '',
      indent: 0,
      children: paragraphs,
    } as SerializedRootNode<SerializedLexicalNode>,
  };
}
