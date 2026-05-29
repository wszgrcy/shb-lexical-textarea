import { useMemo, useEffect, useCallback, useState } from 'react';
import type { JSX } from 'react';
import type {
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedLexicalNode,
} from 'lexical';
import { DecoratorNode, $applyNodeReplacement } from 'lexical';

// Variable item format: { label: string; value: (number | string)[]; type?: string; suffix?: string }
// `type` defaults to 'variable' but allows other custom types for extensibility.
// `suffix` is an optional string of user input directly saved as-is, displayed after the base value with a dot.
// The full display label = value.join('.') + '.' + suffix (if suffix exists).
// The original `value` array is immutable — only `suffix` can be edited after creation.
export interface VariableItem {
  label: string;
  value: (number | string)[];
  type?: string;
  /** Optional editable suffix string, saved exactly as input by user. */
  suffix?: string;
}

// Serialized variable node - stores the item object
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
  onUpdate,
}: {
  item: VariableItem;
  isMissing: boolean;
  /** Called when the suffix value changes (e.g., user types a new suffix). */
  onUpdate?: (suffix: string) => void;
}) {
  // Use state for editing mode (triggers React re-render on changes)
  const [suffixInput, setSuffixInput] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Compute the display label: original label + current suffix
  const displayLabel = useMemo(() => {
    const base = item.label;
    if (item.suffix && item.suffix.length > 0) {
      return base + '.' + item.suffix;
    }
    return base;
  }, [item.label, item.suffix]);

  useEffect(() => {
    if (isEditing) {
      return;
    }
    if (item.suffix && item.suffix.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuffixInput(item.suffix);
    } else {
      setSuffixInput('');
    }
  }, [item.suffix, isEditing]);

  const handleSubmit = useCallback(() => {
    if (!onUpdate) return;
    const trimmed = suffixInput.trim();
    if (trimmed) {
      onUpdate(trimmed);
    } else {
      // Empty input means remove suffix
      onUpdate('');
    }
    setIsEditing(false);
  }, [suffixInput, onUpdate]);

  const handleBlur = useCallback(() => {
    // On blur, commit the current input
    if (isEditing && onUpdate) {
      const trimmed = suffixInput.trim();
      if (trimmed) {
        onUpdate(trimmed);
      } else {
        onUpdate('');
      }
    }
    setIsEditing(false);
  }, [suffixInput, onUpdate, isEditing]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        // Revert: reset input to current suffix value
        if (item.suffix && item.suffix.length > 0) {
          setSuffixInput(item.suffix);
        } else {
          setSuffixInput('');
        }
        setIsEditing(false);
      }
    },
    [handleSubmit, item.suffix],
  );

  // Custom variables (type: 'custom') should never be marked as missing
  if (item.type === 'custom') {
    return (
      <span className="variable-label variable-label-custom">
        <span className="custom-icon">+</span>
        <span>{displayLabel}</span>
      </span>
    );
  }
  if (isMissing) {
    return (
      <span className="variable-label variable-label-missing">
        <span className="missing-icon">?</span>
        <span className="missing-value">{displayLabel}</span>
      </span>
    );
  }

  // Always editable: show input for suffix when clicked
  if (!isEditing) {
    return (
      <span
        className="variable-label variable-label-editable"
        onClick={(e) => {
          e.preventDefault();
          setIsEditing(true);
        }}
        title="点击添加后缀"
      >
        <span>{displayLabel}</span>
        <span className="edit-indicator">+</span>
      </span>
    );
  }

  if (isEditing) {
    return (
      <span className="variable-label variable-label-editing">
        <span className="base-value">{displayLabel.split('.')[0]}</span>
        <input
          type="text"
          className="suffix-input"
          value={suffixInput}
          onChange={(e) => setSuffixInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          placeholder="添加后缀..."
          title="输入后缀后按回车确认，或按 Escape 取消"
        />
      </span>
    );
  }

  return (
    <span className="variable-label variable-label-default">
      {displayLabel}
    </span>
  );
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
    // Always preserve __editable if already stored in __item (from writable copy propagation)
    // Only delete it if explicitly creating a non-editable node without the flag
    const baseItem = item || { label: '', value: [] };
    this.__item = baseItem;
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
  decorate(editor: LexicalEditor, _config: EditorConfig): JSX.Element {
    return (
      <VariableComponent
        item={this.__item}
        isMissing={this.__isMissing}
        onUpdate={(suffix) => {
          // Use editor.dispatchUpdate to safely trigger state changes from inside React render
          editor.update(() => {
            this.updateSuffix(suffix);
          });
        }}
      />
    );
  }

  /**
   * Update the suffix string (for editable nodes).
   */
  updateSuffix(suffix: string): this {
    const self = this.getWritable();
    self.__item = { ...self.__item, suffix };
    return self;
  }

  /**
   * Get the full display label including suffix.
   */
  getFullLabel(): string {
    const suffix = this.__item.suffix;
    if (suffix && suffix.length > 0) {
      return this.__item.label + '.' + suffix;
    }
    return this.__item.label;
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
   * Get the display label (original base label, without suffix).
   */
  getLabel(): string {
    return this.__item.label;
  }

  /**
   * Get the variable base value as array (used for export lookup).
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
   * Get the flattened base value string key for lookup.
   */
  getValueKey(): string {
    return flattenValue(this.__item.value);
  }

  /**
   * Get the text content (alias for full label, for Lexical compatibility).
   */
  getTextContent(): string {
    return this.getFullLabel();
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
