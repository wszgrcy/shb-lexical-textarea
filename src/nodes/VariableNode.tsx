import type { JSX } from 'react';
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical';
import { DecoratorNode, $applyNodeReplacement } from 'lexical';

// Variable item format: { label: string; value: (number | string)[]; type?: string }
// `type` defaults to 'variable' but allows other custom types for extensibility.
export interface VariableItem {
  label: string;
  value: (number | string)[];
  type?: string;
}

// Serialized variable node - stores the item object for persistence
export interface SerializedVariableNode extends Omit<
  SerializedLexicalNode,
  'type'
> {
  type: 'variable';
  item: VariableItem;
}

/** Flatten the item's array value to a string key for lookup/comparison. */
function flattenValue(arr: (number | string)[]): string {
  return arr.join('|||');
}

// VariableComponent - React component rendered via decorate()
// NOTE: Lexical creates the outer <span class="variable-node"> DOM element via createDOM(),
// then uses React.createPortal to render this component inside it.
// Therefore, this component should NOT wrap itself in another <span class="variable-node">.
function VariableComponent({
  item,
  isMissing,
}: {
  item: VariableItem;
  isMissing: boolean;
}) {
  // Custom variables (type: 'custom') should never be marked as missing
  if (item.type === 'custom') {
    return (
      <span className="variable-label variable-label-custom">
        <span className="custom-icon">+</span>
        <span>{item.label}</span>
      </span>
    );
  }
  if (isMissing) {
    return (
      <span className="variable-label variable-label-missing">
        <span className="missing-icon">?</span>
        <span className="missing-value">{item.label}</span>
      </span>
    );
  }
  return <span className="variable-label">{item.label}</span>;
}

// VariableNode class - extends DecoratorNode for React component rendering
export class VariableNode extends DecoratorNode<JSX.Element> {
  __item: VariableItem;

  static getType(): string {
    return 'variable';
  }

  static clone(node: VariableNode): VariableNode {
    return new VariableNode(node.__item, node.__key);
  }

  constructor(item: VariableItem, key?: NodeKey) {
    super(key);
    this.__item = item || { label: '', value: [] };
  }

  /**
   * Create a VariableNode from serialized JSON.
   */
  static importJSON(serializedNode: SerializedVariableNode): VariableNode {
    const sn = serializedNode as SerializedVariableNode;
    if (sn.item) {
      return $createVariableNode(sn.item);
    }
    return $createVariableNode({ label: '', value: [] });
  }

  exportJSON(): SerializedVariableNode {
    return {
      ...super.exportJSON(),
      type: 'variable',
      version: 1,
      item: this.__item,
    };
  }

  /**
   * Create the wrapper DOM element for the decorator node.
   * Lexical will create this element and React's portal will overlay the component.
   */
  createDOM(_config: EditorConfig): HTMLElement {
    const span = document.createElement('span');
    span.className = 'variable-node';
    span.contentEditable = 'false';
    return span;
  }

  /**
   * Update the DOM when node changes.
   */
  updateDOM(
    _prevNode: VariableNode,
    _dom: HTMLElement,
    _config: EditorConfig,
  ): boolean {
    return false;
  }

  /**
   * Return the React component to render via portal.
   * The outer container DOM element is created by createDOM().
   */
  decorate(_editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <VariableComponent item={this.__item} isMissing={this.__isMissing} />
    );
  }

  /**
   * Prevent adjacent text from merging into this node.
   */
  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }

  /**
   * Get the display label.
   */
  getLabel(): string {
    return this.__item.label;
  }

  /**
   * Get the variable value as array (used for export).
   */
  getValue(): (number | string)[] {
    return this.__item.value;
  }

  /**
   * Get the full item object.
   */
  getItem(): VariableItem {
    return this.__item;
  }

  /**
   * Get the flattened value string key for lookup.
   */
  getValueKey(): string {
    return flattenValue(this.__item.value);
  }

  /**
   * Get the text content (alias for label, for Lexical compatibility).
   */
  getTextContent(): string {
    return this.__item.label;
  }

  /**
   * Check if this variable's value is missing from the known list.
   */
  __isMissing: boolean = false;

  setMissing(missing: boolean): this {
    const self = this.getWritable();
    self.__isMissing = missing;
    return self;
  }

  isMissing(): boolean {
    return this.__isMissing;
  }

  /**
   * Set the variable text (for updates).
   */
  setTextContent(text: string): this {
    const self = this.getWritable();
    self.__item = { label: text, value: [text] };
    return self;
  }

  /**
   * Update the item with a new VariableItem.
   */
  updateItem(item: VariableItem): this {
    const self = this.getWritable();
    self.__item = item;
    return self;
  }

  /**
   * Safety net: reject any text insertion into VariableNode.
   */
  spliceText(
    _offset: number,
    _delCount: number,
    _newText: string,
    _moveSelection?: boolean,
  ): VariableNode {
    // ALWAYS reject text insertion — only allow pure deletions (backspace).
    return this as unknown as VariableNode;
  }

  /**
   * Create a variable node with custom label and value
   */
  static createNode(item: VariableItem): VariableNode {
    const node = new VariableNode(item);
    return node;
  }
}

// Factory function to create VariableNode
export function $createVariableNode(item: VariableItem): VariableNode {
  const node = new VariableNode(item);
  return $applyNodeReplacement(node);
}

// Type guard - check if a node is VariableNode
export function $isVariableNode(
  node: LexicalNode | null | undefined,
): node is VariableNode {
  return node instanceof VariableNode;
}
