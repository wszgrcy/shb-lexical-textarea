import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $createTextNode,
  type TextNode,
  $getRoot,
  type LexicalNode,
  $isElementNode,
} from 'lexical';
import {
  $createVariableNode,
  $isVariableNode,
  type VariableItem,
} from '../nodes/VariableNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

/** A variable entry with display label and value array. */
export interface VariableEntry {
  label: string;
  value: (number | string)[];
  type?: string;
}

/** Type for the dynamically created "new variable" option. */
export type CustomVariableEntry = {
  label: string;
  value: (number | string)[];
  type: 'custom';
  isDynamic: true;
};

/** Signature for a custom variable filter function.
 * Receives the current query string (non-null) and the full variables list,
 * returns the filtered array of variables to display in the autocomplete menu. */
export type VariableFilterFn = (
  query: string,
  variables: VariableEntry[],
) => VariableEntry[];

interface VariablePluginProps {
  /** List of available variables for autocomplete. Each entry is a string/number
   *  or a [label, value array] tuple where label is displayed and value array is stored/exported. */
  variables: VariableEntry[];
  /** Optional callback to mark variable nodes as missing when their value is not in the list. */
  onMissingCheck?: (missingValues: Set<string>) => void;
  /** Optional custom filter function for filtering variables by query.
   * When provided, this function replaces the default label-based filtering.
   * The function receives the current query string and the full variables list,
   * and should return the filtered array of variables to display. */
  variableFilter?: VariableFilterFn;
}

class VariableOption extends MenuOption {
  label: string;
  item: VariableItem;
  isDynamic?: boolean;

  constructor(label: string, item: VariableItem, isDynamic?: boolean) {
    super(label);
    this.label = label;
    this.item = item;
    this.isDynamic = isDynamic;
  }
}

/** Flatten a VariableEntry's value to a string key for comparison. */
function entryValueKey(entry: VariableEntry): string {
  return entry.value.join('|||');
}

/**
 * Internal component that monitors editor updates and marks variable nodes
 * as missing when their value is not found in the variables list.
 */
function MissingVariableChecker({ variables }: { variables: VariableEntry[] }) {
  const [editor] = useLexicalComposerContext();
  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (!editor) return;

    // Build known value keys from current variables list
    const buildKnownKeys = (vars: VariableEntry[]): Set<string> => {
      const keys = new Set<string>();
      for (const entry of vars) {
        keys.add(entryValueKey(entry));
      }
      return keys;
    };

    // Check variable nodes and update their missing state
    // Only mutates if the actual state differs to avoid infinite loops
    const checkAndMarkMissing = (): void => {
      const knownKeys = buildKnownKeys(variables);

      const traverse = (node: LexicalNode): void => {
        if ($isVariableNode(node)) {
          // Skip custom variables - they are dynamically created and should never be marked as missing
          const item = node.getItem();
          if (item.type === 'custom') {
            return;
          }
          const valueKey = node.getValueKey();
          const shouldBeMissing = !knownKeys.has(valueKey);
          // Only setMissing when the state actually changes to prevent infinite loops
          if (shouldBeMissing !== node.isMissing()) {
            node.setMissing(shouldBeMissing);
          }
        }
        if ($isElementNode(node)) {
          for (const child of node.getChildren()) {
            traverse(child);
          }
        }
      };

      editor.update(
        () => {
          isCheckingRef.current = true;
          try {
            traverse($getRoot());
          } finally {
            isCheckingRef.current = false;
          }
        },
        { tag: 'missing-check' },
      );
    };

    // Run immediately on mount and when variables prop changes
    checkAndMarkMissing();

    // Also listen for editor updates (e.g., user inserts/removes variable nodes)
    return editor.registerUpdateListener(({ editorState, tags }) => {
      // Skip our own missing-check updates to avoid infinite loop
      if (isCheckingRef.current) return;
      // tags might be a string, array, or undefined - check safely
      const tagStr = typeof tags === 'string' ? tags : JSON.stringify(tags);
      if (tagStr.includes('missing-check')) return;

      editorState.read(() => {
        checkAndMarkMissing();
      });
    });
  }, [editor, variables]);

  return null;
}

/** Extract display label from a variable entry. */
function entryLabel(entry: VariableEntry): string {
  return entry.label;
}

/** Extract item from a variable entry. */
function entryItem(entry: VariableEntry): VariableItem {
  return { label: entry.label, value: entry.value, type: entry.type };
}

/** Create a dynamic variable entry from query. */
function createDynamicEntry(query: string): CustomVariableEntry {
  return {
    label: query,
    value: [query],
    type: 'custom',
    isDynamic: true,
  };
}
export default function VariablePlugin({
  variables,
  variableFilter,
}: VariablePluginProps) {
  const [queryString, setQueryString] = useState<string | null>(null);

  const triggerMatch = useBasicTypeaheadTriggerMatch('@', { minLength: 0 });

  const options: VariableOption[] = useMemo(() => {
    if (!queryString) {
      return variables.map(
        (entry) => new VariableOption(entryLabel(entry), entryItem(entry)),
      );
    }
    // Use custom filter if provided, otherwise fall back to default label-based filtering
    let filtered = variableFilter
      ? variableFilter(queryString, variables)
      : variables.filter((entry) =>
          entryLabel(entry).toLowerCase().includes(queryString.toLowerCase()),
        );

    const dynamicOptions: VariableOption[] = filtered.map(
      (entry) => new VariableOption(entryLabel(entry), entryItem(entry)),
    );

    const dynamicEntry = createDynamicEntry(queryString);
    dynamicOptions.unshift(
      new VariableOption(
        dynamicEntry.label,
        {
          label: dynamicEntry.label,
          value: dynamicEntry.value,
          type: dynamicEntry.type,
        },
        true,
      ),
    );

    return dynamicOptions;
  }, [queryString, variables, variableFilter]);

  // Callback invoked when a variable option is selected from the menu.
  // NOTE: LexicalTypeaheadMenuPlugin wraps this call inside editor.update(),
  // so we should NOT wrap it in another update block.
  const onSelectOption = useCallback(
    (
      variableOption: VariableOption,
      textNodeContainingQuery: TextNode | null,
      closeMenu: () => void,
      _matchingString: string,
    ) => {
      // Create the new variable node with the selected item
      const variableNode = $createVariableNode(variableOption.item);

      if (textNodeContainingQuery) {
        // Delete any preceding whitespace character (if exists) before replacing.
        const prevSibling = textNodeContainingQuery.getPreviousSibling();
        if ($isTextNode(prevSibling)) {
          const prevText = prevSibling.getTextContent();
          if (prevText.length > 0 && /\s/.test(prevText[prevText.length - 1])) {
            // Remove the trailing whitespace from the previous text node.
            // If the previous node becomes empty, remove it entirely.
            if (prevText.length === 1) {
              prevSibling.remove();
            } else {
              const newPrevText = prevText.slice(0, -1);
              const newPrevNode = $createTextNode(newPrevText);
              prevSibling.replace(newPrevNode);
            }
          }
        }

        // Replace the @query portion with the variable node.
        textNodeContainingQuery.replace(variableNode);
      } else {
        // Fallback: no node to replace, just insert at cursor position
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          selection.insertNodes([variableNode]);
        }
      }

      // Move cursor to AFTER the variable node.
      // With decorator nodes, Lexical treats them as atomic units — cursor jumps over them.
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Place focus right after the variable node in its parent
        const parent = variableNode.getParent();
        if (parent) {
          const index = variableNode.getIndexWithinParent();
          // Focus after the variable node (index + 1 means after this child in the parent)
          selection.focus.set(parent.getKey(), index + 1, 'element');
          selection.anchor.set(parent.getKey(), index + 1, 'element');
        }
      }

      closeMenu();
    },
    [], // editor not needed since we're already inside Lexical's update block
  );

  return (
    <>
      <MissingVariableChecker variables={variables} />
      <LexicalTypeaheadMenuPlugin
        onQueryChange={setQueryString}
        onSelectOption={onSelectOption}
        triggerFn={triggerMatch}
        options={options}
        menuRenderFn={(
          anchorRef,
          {
            selectedIndex,
            selectOptionAndCleanUp,
            setHighlightedIndex,
            options: menuOptions,
          },
          _matchingString,
        ) => {
          if (anchorRef.current == null) return null;

          // Wrap the menu in a div with id typeahead-menu for proper positioning
          anchorRef.current.id = 'typeahead-menu';

          return createPortal(
            <ul className="typeahead-menu variable-menu">
              {menuOptions.map((option, index) => {
                const isDynamic = option.isDynamic === true;
                return (
                  <li
                    key={option.key}
                    ref={option.setRefElement}
                    tabIndex={-1}
                    role="option"
                    aria-selected={selectedIndex === index}
                    className={`typeahead-item ${
                      selectedIndex === index ? 'selected' : ''
                    } ${isDynamic ? 'dynamic-option' : ''}`}
                    onClick={() => {
                      selectOptionAndCleanUp(option);
                    }}
                    onMouseEnter={() => {
                      setHighlightedIndex(index);
                    }}
                  >
                    <button>
                      <span className="option-label">{option.label}</span>
                      {isDynamic && (
                        <span className="dynamic-badge">+ 新建变量</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>,
            anchorRef.current,
          );
        }}
      />
    </>
  );
}
