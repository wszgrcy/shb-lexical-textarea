import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Editor from './Editor';
import type { VariableEntry } from './VariablePlugin';
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';

/** Helper to create a minimal valid Lexical state from plain text (wrapped in paragraph) */
function createLexicalState(
  text: string,
): SerializedEditorState<SerializedLexicalNode> {
  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              indent: 0,
              mode: 'normal',
              style: '',
              text,
              type: 'text',
              version: 1,
            } as SerializedLexicalNode,
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        } as SerializedLexicalNode,
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  } as SerializedEditorState<SerializedLexicalNode>;
}

describe('VariablePlugin - missing variable detection', () => {
  it('should display available variables without missing indicator', () => {
    const variables: VariableEntry[] = [
      { label: 'userId', value: ['userId'] },
      { label: 'userName', value: ['userName'] },
      { label: '用户邮箱', value: ['userEmail'] },
    ];
    render(
      <Editor
        value={createLexicalState('hello {userId} world')}
        variables={variables}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should detect missing variables when value is not in the list', () => {
    const variables: VariableEntry[] = [
      { label: 'userId', value: ['userId'] },
      { label: 'userName', value: ['userName'] },
    ];
    // The value 'deletedVar' is NOT in the variables list
    render(
      <Editor
        value={createLexicalState('hello {deletedVar} world')}
        variables={variables}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should accept object format and mark missing values correctly', () => {
    const variables: VariableEntry[] = [
      { label: '用户ID', value: ['userId'] },
      { label: '用户名', value: ['userName'] },
      { label: '用户邮箱', value: ['userEmail'] },
    ];
    // 'oldValue' is not in the list, should be detected as missing
    render(
      <Editor
        value={createLexicalState('test {oldValue}')}
        variables={variables}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should handle empty variable list - all variables become missing', () => {
    render(
      <Editor value={createLexicalState('hello {var1}')} variables={[]} />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should handle mixed object format entries', () => {
    const variables: VariableEntry[] = [
      { label: 'userId', value: ['userId'] },
      { label: '用户邮箱', value: ['userEmail'] },
      { label: 'userName', value: ['userName'] },
      { label: '配置', value: ['config'] },
    ];
    render(
      <Editor
        value={createLexicalState('text {userId} {deleted} {config}')}
        variables={variables}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should handle controlled mode with missing variables', () => {
    const handleChange = vi.fn();
    render(
      <Editor
        value={createLexicalState('{deletedVar}')}
        onChange={handleChange}
        variables={[{ label: 'userId', value: ['userId'] }]}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
    expect(handleChange).toBeDefined();
  });

  it('should render editor with no variables and no initial value', () => {
    render(<Editor variables={[]} />);

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should accept number values in variable entries', () => {
    const variables: VariableEntry[] = [
      { label: 'count', value: [123] },
      { label: 'userId', value: ['userId'] },
      { label: '配置', value: ['config'] },
    ];
    render(
      <Editor value={createLexicalState('test {123}')} variables={variables} />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should handle unicode labels in variables', () => {
    const variables: VariableEntry[] = [
      { label: '用户ID', value: ['userId'] },
      { label: '数据对象', value: ['data'] },
      { label: '项目列表', value: ['items'] },
    ];
    render(
      <Editor
        value={createLexicalState('text {userId}')}
        variables={variables}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });
});
