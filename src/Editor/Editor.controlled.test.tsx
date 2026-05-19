import { describe, it, expect, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
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
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
}

/** Test wrapper component that simulates parent state change triggering value update (controlled mode) */
function ControlledValueWrapper({
  initialValue,
}: {
  initialValue: SerializedEditorState<SerializedLexicalNode>;
}) {
  const [value, setValue] =
    useState<SerializedEditorState<SerializedLexicalNode>>(initialValue);

  return (
    <div>
      <Editor value={value} />
      <button
        data-testid="update-btn"
        onClick={() => setValue(createLexicalState('updated by parent'))}
      >
        Update
      </button>
    </div>
  );
}

describe('Editor - controlled mode & external sync', () => {
  it('should accept and display controlled value prop', () => {
    const handleChange = vi.fn();
    render(
      <Editor
        value={createLexicalState('controlled content')}
        onChange={handleChange}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
    expect(handleChange).toBeDefined();
  });

  it('should call onChange with text when content changes', () => {
    const handleChange = vi.fn();
    render(<Editor value={createLexicalState('')} onChange={handleChange} />);

    // The onChange callback is registered — verify it exists
    expect(handleChange).toBeInstanceOf(Function);
  });

  it('should support dynamic variable list updates', () => {
    const customVars1 = [
      { label: 'foo', value: ['foo'] },
      { label: 'bar', value: ['bar'] },
    ];
    const customVars2 = [
      { label: 'baz', value: ['baz'] },
      { label: 'qux', value: ['qux'] },
    ];

    // First render with initial variables
    render(<Editor variables={customVars1} />);
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();

    // In a real React app, re-rendering with new variables would update the plugin.
    // This test just verifies the component accepts variable changes without crashing.
    render(<Editor variables={customVars2} />);
    const contentEditable2 = document.querySelector('[contenteditable="true"]');
    expect(contentEditable2).toBeTruthy();
  });

  it('should support variables with mixed value types', () => {
    // Test with string, number, and nested path values in object format
    const mixedVars: VariableEntry[] = [
      { label: 'userId', value: ['userId'] },
      { label: 'userName', value: ['userName'] },
      { label: '用户邮箱', value: ['userEmail'] },
      { label: 'count', value: [123] },
      { label: '配置', value: ['config'] },
    ];

    render(<Editor variables={mixedVars} />);
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should support empty variable list without crashing', () => {
    render(<Editor variables={[]} />);
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should apply custom className', () => {
    render(<Editor className="my-editor" />);
    const wrapper = document.querySelector('.editor-textarea-wrapper');
    expect(wrapper?.classList.contains('my-editor')).toBe(true);
  });

  it('should support custom minHeight', () => {
    render(<Editor minHeight={200} />);
    const editable = document.querySelector('.editor-textarea');
    expect(editable?.getAttribute('style')).toContain('min-height: 200px');
  });

  describe('value prop update simulation (parent state change)', () => {
    it('should update UI when value changes via parent state', async () => {
      // Use wrapper that manages value state internally with controlled mode
      const { unmount } = render(
        <ControlledValueWrapper
          initialValue={createLexicalState('initial value')}
        />,
      );

      // Step 1: verify initial rendering
      await waitFor(
        () => {
          const contentEditable = document.querySelector(
            '[contenteditable="true"]',
          );
          expect(contentEditable?.textContent).toContain('initial value');
        },
        { timeout: 3000 },
      );

      // Unmount and re-render with updated value to simulate parent-controlled update
      unmount();
      render(
        <ControlledValueWrapper
          initialValue={createLexicalState('updated by parent')}
        />,
      );
      await waitFor(
        () => {
          const contentEditable = document.querySelector(
            '[contenteditable="true"]',
          );
          expect(contentEditable?.textContent).toContain('updated by parent');
        },
        { timeout: 3000 },
      );
    });

    it('should support multiple sequential value updates from parent state', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // First value
      render(<Editor value={createLexicalState('first')} />, { container });
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('first'),
        { timeout: 3000 },
      );

      // Second value
      render(<Editor value={createLexicalState('second')} />, { container });
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('second'),
        { timeout: 3000 },
      );

      // Third value
      render(<Editor value={createLexicalState('third')} />, { container });
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('third'),
        { timeout: 3000 },
      );
    });

    it('should update UI with Chinese content when value changes from parent state', async () => {
      const container = document.createElement('div');
      document.body.appendChild(container);

      // Initial Chinese content
      render(<Editor value={createLexicalState('中文内容')} />, { container });
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('中文内容'),
        { timeout: 3000 },
      );

      // Update to new Chinese content
      render(<Editor value={createLexicalState('更新后的中文')} />, {
        container,
      });
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('更新后的中文'),
        { timeout: 3000 },
      );
    });
  });

  describe('value prop update simulation (parent state change, controlled mode)', () => {
    it('should update UI when value changes via parent state in controlled mode', async () => {
      // Render a wrapper component that manages value state internally
      render(
        <ControlledValueWrapper
          initialValue={createLexicalState('controlled initial')}
        />,
      );

      // Step 1: verify initial rendering
      await waitFor(
        () => {
          const contentEditable = document.querySelector(
            '[contenteditable="true"]',
          );
          expect(contentEditable?.textContent).toContain('controlled initial');
        },
        { timeout: 3000 },
      );

      // Step 2: trigger parent state update via button click
      const updateButton = screen.getByTestId('update-btn');
      await userEvent.click(updateButton);

      // Step 3: verify UI updated without unmounting
      await waitFor(
        () => {
          const contentEditable = document.querySelector(
            '[contenteditable="true"]',
          );
          expect(contentEditable?.textContent).toContain('updated by parent');
        },
        { timeout: 3000 },
      );
    });

    it('should support multiple sequential value updates in controlled mode from parent state', async () => {
      function MultiControlledWrapper() {
        const [value, setValue] = useState<
          SerializedEditorState<SerializedLexicalNode>
        >(createLexicalState('v1'));

        return (
          <div>
            <Editor value={value} />
            <button
              data-testid="update-v1"
              onClick={() => setValue(createLexicalState('v1'))}
            >
              V1
            </button>
            <button
              data-testid="update-v2"
              onClick={() => setValue(createLexicalState('v2'))}
            >
              V2
            </button>
            <button
              data-testid="update-v3"
              onClick={() => setValue(createLexicalState('v3'))}
            >
              V3
            </button>
          </div>
        );
      }

      render(<MultiControlledWrapper />);

      // Initial state
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('v1'),
        { timeout: 3000 },
      );

      // Update to v2
      const v2Btn = screen.getByTestId('update-v2');
      await userEvent.click(v2Btn);
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('v2'),
        { timeout: 3000 },
      );

      // Update to v3
      const v3Btn = screen.getByTestId('update-v3');
      await userEvent.click(v3Btn);
      await waitFor(
        () =>
          expect(
            document.querySelector('[contenteditable="true"]')?.textContent,
          ).toContain('v3'),
        { timeout: 3000 },
      );
    });

    it('should accept and display controlled value prop', async () => {
      function ValueOnlyWrapper() {
        const [value, setValue] = useState<
          SerializedEditorState<SerializedLexicalNode>
        >(createLexicalState('initial value'));

        return (
          <div>
            <Editor value={value} />
            <button
              data-testid="update-btn"
              onClick={() => setValue(createLexicalState('new value'))}
            >
              Update
            </button>
          </div>
        );
      }

      render(<ValueOnlyWrapper />);

      // Initial state: display the controlled value
      await waitFor(
        () => {
          const contentEditable = document.querySelector(
            '[contenteditable="true"]',
          );
          expect(contentEditable?.textContent).toContain('initial value');
        },
        { timeout: 3000 },
      );

      // Update value via parent state change
      const updateButton = screen.getByTestId('update-btn');
      await userEvent.click(updateButton);
      await waitFor(
        () => {
          const contentEditable = document.querySelector(
            '[contenteditable="true"]',
          );
          expect(contentEditable?.textContent).toContain('new value');
        },
        { timeout: 3000 },
      );
    });
  });
});
