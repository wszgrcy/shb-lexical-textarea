import { useEffect, useRef, useMemo } from 'react';
import { LexicalExtensionComposer } from '@lexical/react/LexicalExtensionComposer';
import {
  defineExtension,
  configExtension,
  type SerializedEditorState,
  type SerializedLexicalNode,
} from 'lexical';
import { ReactExtension } from '@lexical/react/ReactExtension';
import { RichTextExtension } from '@lexical/rich-text';
import { HistoryExtension } from '@lexical/history';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import VariablePlugin, { type VariableEntry, type VariableFilterFn } from './VariablePlugin';

import { VariableNode } from '../nodes/VariableNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { deepEqual } from 'fast-equals';
export interface EditorProps {
  /** Current text content (controlled mode). If not provided, editor starts with empty state. */
  value?: SerializedEditorState<SerializedLexicalNode>;
  /** Callback fired when content changes. Receives the raw Lexical JSON state object. */
  onChange?: (jsonState: SerializedEditorState<SerializedLexicalNode>) => void;
  /** List of available variables for @ autocomplete. */
  variables?: VariableEntry[];
  /** Optional custom filter function for filtering variables by query. */
  variableFilter?: VariableFilterFn;
  /** When true, disables the variable autocomplete plugin. The VariableNode type is still registered. Default: false. */
  disableVariablePlugin?: boolean;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** CSS class name(s) applied to the wrapper div */
  className?: string;
  /** Minimum height in pixels */
  minHeight?: number;
}

const onError = (error: Error) => {
  console.error(error);
};

export default function Editor({
  value,
  onChange,
  variables = [],
  variableFilter,
  disableVariablePlugin = false,
  placeholder = '',
  className = '',
  minHeight = 120,
}: EditorProps) {
  const editorExtension = useMemo(
    () =>
      defineExtension({
        name: 'VariableEditor',
        namespace: 'VariableEditor',
        dependencies: [
          RichTextExtension,
          HistoryExtension,
          configExtension(ReactExtension, {
            contentEditable: null,
            ErrorBoundary: LexicalErrorBoundary,
          }),
        ],
        nodes: () => [VariableNode],
        onError,
      }),
    [],
  );

  return (
    <LexicalExtensionComposer
      extension={editorExtension}
      contentEditable={null}
    >
      <div className={`editor-textarea-wrapper ${className}`.trim()}>
        <ContentEditable
          className="editor-textarea"
          style={{ minHeight }}
          aria-placeholder={placeholder}
          placeholder={
            <span className="editor-placeholder">{placeholder}</span>
          }
        />
        {!disableVariablePlugin && (
          <VariablePlugin variables={variables} variableFilter={variableFilter} />
        )}
        {/* Listens to changes and emits JSON state, syncs controlled value back into editor */}
        <ChangeEmitter onStateChange={onChange} value={value} />
      </div>
    </LexicalExtensionComposer>
  );
}

/**
 * Internal component: listens to Lexical editor updates, fires onChange with JSON state,
 * and syncs external controlled value into the editor.
 */
function ChangeEmitter({
  onStateChange,
  value,
}: {
  onStateChange?: (
    jsonState: SerializedEditorState<SerializedLexicalNode>,
  ) => void;
  value?: SerializedEditorState<SerializedLexicalNode>;
}) {
  const [editor] = useLexicalComposerContext();
  // prevJSONRef tracks the last emitted JSON object to avoid duplicate emits
  const prevValueRef =
    useRef<SerializedEditorState<SerializedLexicalNode>>(undefined);

  // On subsequent changes: sync updates into the editor only when external value actually changes
  useEffect(() => {
    if (!editor) return;

    if (value && !deepEqual(value, prevValueRef.current)) {
      const parsedState = editor.parseEditorState(value);
      if (!parsedState.isEmpty()) {
        editor.setEditorState(parsedState, { tag: 'external' });
      }
      prevValueRef.current = value;
    }
  }, [editor, value]);

  useEffect(() => {
    if (!editor) return;
    return editor.registerUpdateListener((editorState) => {
      const tags = editorState.tags;
      if (tags.has('external') || tags.has('missing-check')) return;
      editor.read(() => {
        const stateJson = editor.getEditorState().toJSON();
        prevValueRef.current = stateJson;
        onStateChange?.(stateJson);
      });
    });
  }, [editor, onStateChange]);

  return null;
}
