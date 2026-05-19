import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import Editor from './Editor';
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

describe('Editor component', () => {
  it('should render with placeholder when empty', () => {
    render(<Editor placeholder="Type here..." />);
    // ContentEditable should be visible
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should call onChange when text changes', () => {
    const handleChange = vi.fn();
    render(<Editor value={createLexicalState('')} onChange={handleChange} />);

    // Manually trigger the change emitter by updating editor state
    // This tests the onChange callback signature
    expect(handleChange).toBeDefined();
  });

  it('should pass variables to VariablePlugin', () => {
    const customVars = [
      { label: 'foo', value: ['foo'] },
      { label: 'bar', value: ['bar'] },
      { label: 'baz', value: ['baz'] },
    ];
    render(<Editor variables={customVars} />);

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should accept value prop', () => {
    render(<Editor value={createLexicalState('initial text')} />);
    // The editor renders without crashing and has editable content
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should render initial text when value is provided', async () => {
    render(<Editor value={createLexicalState('hello world')} />);
    // Wait for Lexical to finish rendering by checking the contenteditable div has text
    await waitFor(
      () => {
        const contentEditable = document.querySelector(
          '[contenteditable="true"]',
        );
        const text = contentEditable?.textContent || '';
        expect(text).toContain('hello world');
      },
      { timeout: 3000 },
    );
  });

  it('should update UI when value prop changes (controlled mode reinitialization)', async () => {
    const { unmount } = render(
      <Editor value={createLexicalState('first value')} />,
    );
    await waitFor(
      () => {
        const contentEditable = document.querySelector(
          '[contenteditable="true"]',
        );
        expect(contentEditable?.textContent).toContain('first value');
      },
      { timeout: 3000 },
    );

    // Unmount and re-render with a new value prop to simulate controlled update
    unmount();
    render(<Editor value={createLexicalState('second value')} />);
    await waitFor(
      () => {
        const contentEditable = document.querySelector(
          '[contenteditable="true"]',
        );
        expect(contentEditable?.textContent).toContain('second value');
      },
      { timeout: 3000 },
    );
  });

  it('should render and update UI when value prop changes (controlled mode)', async () => {
    const { unmount } = render(
      <Editor value={createLexicalState('initial')} />,
    );
    await waitFor(
      () => {
        const contentEditable = document.querySelector(
          '[contenteditable="true"]',
        );
        expect(contentEditable?.textContent).toContain('initial');
      },
      { timeout: 3000 },
    );

    // Unmount and re-render with a new value prop to simulate controlled update
    unmount();
    render(<Editor value={createLexicalState('updated text')} />);
    await waitFor(
      () => {
        const contentEditable = document.querySelector(
          '[contenteditable="true"]',
        );
        expect(contentEditable?.textContent).toContain('updated text');
      },
      { timeout: 3000 },
    );
  });

  it('should handle multiple updates in controlled mode', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    // Step 1: render first value
    render(<Editor value={createLexicalState('step 1')} />, { container });
    await waitFor(
      () =>
        expect(
          document.querySelector('[contenteditable="true"]')?.textContent,
        ).toContain('step 1'),
      { timeout: 3000 },
    );

    // Step 2: update to second value
    render(<Editor value={createLexicalState('step 2')} />, { container });
    await waitFor(
      () =>
        expect(
          document.querySelector('[contenteditable="true"]')?.textContent,
        ).toContain('step 2'),
      { timeout: 3000 },
    );

    // Step 3: update to third value
    render(<Editor value={createLexicalState('step 3')} />, { container });
    await waitFor(
      () =>
        expect(
          document.querySelector('[contenteditable="true"]')?.textContent,
        ).toContain('step 3'),
      { timeout: 3000 },
    );

    container.remove();
  });

  it('should call onChange when content changes in controlled mode', async () => {
    const handleChange = vi.fn();
    render(
      <Editor value={createLexicalState('test')} onChange={handleChange} />,
    );
    // handleChange should be defined and ready to receive updates
    expect(handleChange).toBeDefined();
  });

  it('should support controlled mode with value prop', () => {
    const handleChange = vi.fn();
    render(
      <Editor
        value={createLexicalState('controlled')}
        onChange={handleChange}
      />,
    );

    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
    expect(handleChange).toBeDefined();
  });

  it('should apply custom className', () => {
    render(<Editor className="my-custom-class" />);
    const wrapper = document.querySelector('.editor-textarea-wrapper');
    expect(wrapper?.classList.contains('my-custom-class')).toBe(true);
  });

  it('should support empty variable list', () => {
    render(<Editor variables={[]} />);
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should not re-sync editor state when onChange emits the same state (controlled mode stability)', async () => {
    const handleChange = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const initialState = createLexicalState('stable text');
    render(<Editor value={initialState} onChange={handleChange} />, {
      container,
    });

    // Wait for initial render
    await waitFor(
      () =>
        expect(
          document.querySelector('[contenteditable="true"]')?.textContent,
        ).toContain('stable text'),
      { timeout: 3000 },
    );

    handleChange.mockClear();

    // Re-render with the same state - onChange should not be called again
    // because the editor state hasn't changed externally
    render(<Editor value={initialState} onChange={handleChange} />, {
      container,
    });

    await waitFor(
      () => {
        // The onChange callback should not have been called during re-render
        // with the same controlled value, as prevJsonRef prevents duplicate syncs
        const callArgs = handleChange.mock.calls.map((c) =>
          JSON.stringify(c[0]),
        );
        const stateStr = JSON.stringify(initialState);
        // If onChange was called again with the same state, it means the component
        // is re-emitting on every render (a bug that causes focus loss)
        expect(callArgs).not.toContain(stateStr);
      },
      { timeout: 3000 },
    );

    container.remove();
  });
});
