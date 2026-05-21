import { describe, it, expect } from 'vitest';
import type { SerializedEditorState } from 'lexical';
import {
  simplifyEditorState,
  restoreEditorState,
  extractVariableItems,
  type SimplifiedState,
} from './VariableStateSimplifier';

// Helper to build a SerializedEditorState for testing
function createSerializedState(
  paragraphs: {
    children: Array<{ text?: string; type?: string; item?: any }>;
  }[],
): SerializedEditorState {
  return {
    root: {
      type: 'root',
      children: paragraphs.map((p) => ({
        type: 'paragraph',
        children: p.children.map((c) => {
          if (c.type === 'variable') {
            return { type: 'variable', version: 1, item: c.item };
          }
          return {
            type: 'text',
            version: 1,
            text: c.text ?? '',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          };
        }),
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })),
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  };
}

describe('VariableStateSimplifier', () => {
  describe('simplifyEditorState', () => {
    it('should return empty array for empty state', () => {
      const state = { root: { type: 'root', children: [], version: 1 } as any };
      expect(simplifyEditorState(state)).toEqual([]);
    });

    it('should handle state with missing root or children', () => {
      expect(simplifyEditorState({} as SerializedEditorState)).toEqual([]);
      expect(simplifyEditorState({ root: {} } as SerializedEditorState)).toEqual([]);
    });

    it('should keep only essential fields and strip defaults', () => {
      const state = createSerializedState([
        { children: [{ text: 'Hello ' }] },
      ]);
      const result = simplifyEditorState(state);
      const textNode = result[0][0];
      expect(textNode).toEqual({ text: 'Hello ', type: 'text' });
      expect(textNode).not.toHaveProperty('version');
      expect(textNode).not.toHaveProperty('detail');
      expect(textNode).not.toHaveProperty('format');

      const stateWithVar = createSerializedState([
        { children: [{ type: 'variable', item: { label: 'var1', value: ['var1'] } }] },
      ]);
      const resultWithVar = simplifyEditorState(stateWithVar);
      expect(resultWithVar[0][0]).not.toHaveProperty('version');
      expect(resultWithVar[0][0]).not.toHaveProperty('key');
    });

    it('should preserve variable metadata (type, number values)', () => {
      const state = createSerializedState([
        {
          children: [
            { type: 'variable', item: { label: 'customVar', value: ['field1'], type: 'custom' } },
            { type: 'variable', item: { label: 'count', value: [123, 456] } },
          ],
        },
      ]);
      const result = simplifyEditorState(state);
      expect(result[0][0]).toEqual({
        type: 'variable',
        item: { label: 'customVar', value: ['field1'], type: 'custom' },
      });
      expect(result[0][1]).toEqual({
        type: 'variable',
        item: { label: 'count', value: [123, 456] },
      });
    });

    it('should preserve empty paragraphs as empty arrays', () => {
      const state = createSerializedState([
        { children: [] },
        { children: [{ text: 'Content' }] },
        { children: [] },
      ]);
      const result = simplifyEditorState(state);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual([]);
      expect(result[1]).toEqual([{ text: 'Content', type: 'text' }]);
      expect(result[2]).toEqual([]);
    });

    it('should handle complex mixed content across multiple paragraphs', () => {
      const state = createSerializedState([
        {
          children: [
            { text: 'Dear ' },
            { type: 'variable', item: { label: 'userName', value: ['userName'] } },
            { text: ', your order ' },
            { type: 'variable', item: { label: 'orderId', value: ['orderId'] } },
            { text: ' is ready.' },
          ],
        },
        { children: [{ text: 'Thank you for your purchase!' }] },
        {
          children: [
            { text: 'Total: $' },
            { type: 'variable', item: { label: 'totalAmount', value: ['total'] } },
          ],
        },
      ]);
      const result = simplifyEditorState(state);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveLength(5);
      expect(result[0][0]).toEqual({ text: 'Dear ', type: 'text' });
      expect(result[0][1]).toEqual({ type: 'variable', item: { label: 'userName', value: ['userName'] } });
      expect(result[1]).toEqual([{ text: 'Thank you for your purchase!', type: 'text' }]);
      expect(result[2][1]).toEqual({ type: 'variable', item: { label: 'totalAmount', value: ['total'] } });
    });
  });

  describe('restoreEditorState', () => {
    it('should restore an empty state', () => {
      expect(restoreEditorState([] as SimplifiedState).root.children).toHaveLength(0);
    });

    it('should skip empty sub-arrays and not create empty paragraphs', () => {
      const result = restoreEditorState([
        [],
        [{ text: 'Content', type: 'text' }],
        [],
      ] as SimplifiedState);
      expect(result.root.children).toHaveLength(1);
    });

    it('should add default lexical fields when restoring', () => {
      const result = restoreEditorState([[{ text: 'test', type: 'text' }]] as SimplifiedState);
      const paragraph = result.root.children[0] as any;
      expect(paragraph.direction).toBe(null);
      expect(paragraph.format).toBe('');
      expect(paragraph.indent).toBe(0);
      expect(paragraph.version).toBe(1);
      expect(paragraph.textFormat).toBe(0);
      expect(paragraph.textStyle).toBe('');

      const children = paragraph.children;
      expect(children[0]).toEqual({
        type: 'text', version: 1, text: 'test',
        detail: 0, format: 0, mode: 'normal', style: '',
      });
    });

    it('should restore mixed content with variables preserving metadata', () => {
      const result = restoreEditorState([
        [
          { text: 'Hello ', type: 'text' },
          { type: 'variable', item: { label: 'customVar', value: ['field1'], type: 'custom' } },
          { type: 'variable', item: { label: 'count', value: [123, 456] } },
          { text: '!', type: 'text' },
        ],
      ] as SimplifiedState);
      const children = (result.root.children[0] as any).children;
      expect(children).toHaveLength(4);
      expect(children[0].text).toBe('Hello ');
      expect(children[1].type).toBe('variable');
      expect(children[1].item.type).toBe('custom');
      expect(children[2].item.value).toEqual([123, 456]);
      expect(children[3].text).toBe('!');
    });

    it('should restore multiple paragraphs', () => {
      const result = restoreEditorState([
        [{ text: 'Line 1', type: 'text' }],
        [{ text: 'Line 2', type: 'text' }],
        [{ text: 'Line 3', type: 'text' }],
      ] as SimplifiedState);
      expect(result.root.children).toHaveLength(3);
      result.root.children.forEach((p, i) => {
        expect(p.type).toBe('paragraph');
        expect((p as any).children[0].text).toBe(`Line ${i + 1}`);
      });
    });
  });

  describe('roundtrip: simplify -> restore', () => {
    it('should preserve content through simplify -> restore cycle', () => {
      const original = createSerializedState([
        { children: [{ text: 'Hello World' }] },
        {
          children: [
            { text: 'Dear ' },
            { type: 'variable', item: { label: 'userName', value: ['userName'] } },
            { text: ', your order ' },
            { type: 'variable', item: { label: 'orderId', value: ['orderId'] } },
            { text: ' is ready.' },
          ],
        },
        { children: [{ text: 'Thank you!' }] },
        {
          children: [
            { text: 'Total: $' },
            { type: 'variable', item: { label: 'totalAmount', value: ['total'] } },
          ],
        },
      ]);

      const simplified = simplifyEditorState(original);
      const restored = restoreEditorState(simplified);

      // Verify paragraph count
      expect(restored.root.children).toHaveLength(4);

      // Verify text-only paragraph preserved
      expect((restored.root.children[0] as any).children[0].text).toBe('Hello World');

      // Verify mixed paragraph with variables
      const p1 = (restored.root.children[1] as any).children;
      expect(p1).toHaveLength(5);
      expect(p1[0].text).toBe('Dear ');
      expect(p1[1].item.label).toBe('userName');
      expect(p1[2].text).toBe(', your order ');
      expect(p1[3].item.label).toBe('orderId');
      expect(p1[4].text).toBe(' is ready.');

      // Verify final mixed paragraph
      const p3 = (restored.root.children[3] as any).children;
      expect(p3).toHaveLength(2);
      expect(p3[0].text).toBe('Total: $');
      expect(p3[1].item.label).toBe('totalAmount');
    });

    it('should handle empty state roundtrip', () => {
      const original = createSerializedState([]);
      const restored = restoreEditorState(simplifyEditorState(original));
      expect(restored.root.children).toHaveLength(0);
    });

    it('should preserve variable metadata through roundtrip', () => {
      const original = createSerializedState([
        {
          children: [
            { type: 'variable', item: { label: 'customVar', value: ['field1'], type: 'custom' } },
            { type: 'variable', item: { label: 'count', value: [123, 456] } },
          ],
        },
      ]);
      const restored = restoreEditorState(simplifyEditorState(original));
      const children = (restored.root.children[0] as any).children;
      expect(children[0].item).toEqual({ label: 'customVar', value: ['field1'], type: 'custom' });
      expect(children[1].item).toEqual({ label: 'count', value: [123, 456] });
    });
  });

  describe('extractVariableItems', () => {
    it('should return empty arrays for empty state', () => {
      const result = extractVariableItems([] as SimplifiedState);
      expect(result).toEqual({ all: [], default: [], custom: [] });
    });

    it('should return empty arrays when no variables exist', () => {
      const state = createSerializedState([
        { children: [{ text: 'Hello World' }] },
        { children: [{ text: 'No variables here' }] },
      ]);
      const simplified = simplifyEditorState(state);
      const result = extractVariableItems(simplified);
      expect(result).toEqual({ all: [], default: [], custom: [] });
    });

    it('should extract all variable items', () => {
      const state = createSerializedState([
        {
          children: [
            { text: 'Dear ' },
            { type: 'variable', item: { label: 'userName', value: ['userName'] } },
            { text: ', your order ' },
            { type: 'variable', item: { label: 'orderId', value: ['orderId'] } },
            { text: ' is ready.' },
          ],
        },
      ]);
      const simplified = simplifyEditorState(state);
      const result = extractVariableItems(simplified);

      expect(result.all).toHaveLength(2);
      expect(result.all[0]).toEqual({ label: 'userName', value: ['userName'] });
      expect(result.all[1]).toEqual({ label: 'orderId', value: ['orderId'] });
    });

    it('should separate default and custom variables by type', () => {
      const state = createSerializedState([
        {
          children: [
            { type: 'variable', item: { label: 'userName', value: ['userName'], type: 'default' } },
            { type: 'variable', item: { label: 'customVar', value: ['field1'], type: 'custom' } },
            { type: 'variable', item: { label: 'orderId', value: ['orderId'] } },
          ],
        },
      ]);
      const simplified = simplifyEditorState(state);
      const result = extractVariableItems(simplified);

      expect(result.all).toHaveLength(3);
      expect(result.default).toHaveLength(1);
      expect(result.default[0]).toEqual({ label: 'userName', value: ['userName'], type: 'default' });
      expect(result.custom).toHaveLength(1);
      expect(result.custom[0]).toEqual({ label: 'customVar', value: ['field1'], type: 'custom' });
    });

    it('should handle variables without type field (treated as neither default nor custom)', () => {
      const state = createSerializedState([
        {
          children: [
            { type: 'variable', item: { label: 'noTypeVar', value: ['value1'] } },
            { type: 'variable', item: { label: 'defaultVar', value: ['value2'], type: 'default' } },
          ],
        },
      ]);
      const simplified = simplifyEditorState(state);
      const result = extractVariableItems(simplified);

      expect(result.all).toHaveLength(2);
      expect(result.default).toHaveLength(1);
      expect(result.custom).toHaveLength(0);
    });

    it('should extract variables from multiple paragraphs', () => {
      const state = createSerializedState([
        {
          children: [
            { type: 'variable', item: { label: 'var1', value: ['a'], type: 'default' } },
          ],
        },
        { children: [{ text: 'middle paragraph with no variables' }] },
        {
          children: [
            { text: 'Total: $' },
            { type: 'variable', item: { label: 'var2', value: [123], type: 'custom' } },
          ],
        },
      ]);
      const simplified = simplifyEditorState(state);
      const result = extractVariableItems(simplified);

      expect(result.all).toHaveLength(2);
      expect(result.default).toHaveLength(1);
      expect(result.custom).toHaveLength(1);
      expect(result.default[0].label).toBe('var1');
      expect(result.custom[0].label).toBe('var2');
    });

    it('should preserve variable metadata including numeric values', () => {
      const state = createSerializedState([
        {
          children: [
            { type: 'variable', item: { label: 'count', value: [123, 456], type: 'default' } },
          ],
        },
      ]);
      const simplified = simplifyEditorState(state);
      const result = extractVariableItems(simplified);

      expect(result.default).toHaveLength(1);
      expect(result.default[0]).toEqual({ label: 'count', value: [123, 456], type: 'default' });
    });
  });
});
