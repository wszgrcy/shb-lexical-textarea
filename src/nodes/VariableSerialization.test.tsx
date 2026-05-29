import { describe, it, expect } from 'vitest';
import {
  type SerializedEditorState,
  type SerializedLexicalNode,
} from 'lexical';
import {
  serializeTemplate,
  findCustomVariables,
} from './VariableSerialization';

const demoContext: { [key: string]: string } = {
  userId: 'user-123',
  userName: '张三',
  userEmail: 'zhangsan@example.com',
  'bbb.ccc': 'nested-value',
};

describe('VariableSerialization', () => {
  describe('serializeTemplate', () => {
    function createSerializedState(
      variableItems: {
        label: string;
        value: (number | string)[];
        type?: string;
      }[],
    ): SerializedEditorState<SerializedLexicalNode> {
      return {
        root: {
          type: 'root',
          children: variableItems.map((item) => ({
            type: 'paragraph',
            children: [{ type: 'variable', version: 1, item, key: 'mock-key' }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            key: `mock-key-${item.label}`,
          })),
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      };
    }

    it('should resolve variables using the resolver function', () => {
      const state = createSerializedState([
        { label: 'userId', value: ['userId'] },
      ]);
      const result = serializeTemplate(state, (item) => {
        const key = item.value.map((v) => String(v)).join('.');
        return demoContext[key] ?? `{${key}}`;
      });
      expect(result).toBe('user-123\n');
    });

    it('should resolve nested path variables', () => {
      const state = createSerializedState([
        { label: '嵌套路径', value: ['bbb', 'ccc'] },
      ]);
      const result = serializeTemplate(state, (item) => {
        const key = item.value.map((v) => String(v)).join('.');
        return demoContext[key] ?? `{${key}}`;
      });
      expect(result).toBe('nested-value\n');
    });

    it('should handle multiple variables', () => {
      const state = createSerializedState([
        { label: 'userName', value: ['userName'] },
        { label: 'userEmail', value: ['userEmail'] },
      ]);
      const result = serializeTemplate(state, (item) => {
        const key = item.value.map((v) => String(v)).join('.');
        return demoContext[key] ?? `{${key}}`;
      });
      expect(result).toBe('张三\nzhangsan@example.com\n');
    });

    it('should fallback to placeholder for unknown variables', () => {
      const state = createSerializedState([
        { label: 'unknownVar', value: ['unknownVar'] },
      ]);
      const result = serializeTemplate(state, (item) => {
        const key = item.value.map((v) => String(v)).join('.');
        return demoContext[key] ?? `{${key}}`;
      });
      expect(result).toBe('{unknownVar}\n');
    });

    it('should call the resolver with item including type field', () => {
      const state = createSerializedState([
        { label: 'userId', value: ['userId'], type: 'user-id' },
      ]);
      let resolvedType: string | undefined;
      serializeTemplate(state, (item) => {
        resolvedType = item.type;
        return item.label;
      });
      expect(resolvedType).toBe('user-id');
    });

    it('should allow type-based resolution', () => {
      const state = createSerializedState([
        { label: 'userId', value: ['myUserId'], type: 'text' },
        { label: 'formattedDate', value: ['date'], type: 'datetime' },
      ]);
      const result = serializeTemplate(state, (item) => {
        if (item.type === 'datetime') {
          return `[${item.label}]`;
        }
        // myUserId is not in demoContext, so fallback to placeholder
        const key = item.value.map((v) => String(v)).join('.');
        return demoContext[key] ?? `{${key}}`;
      });
      expect(result).toBe('{myUserId}\n[formattedDate]\n');
    });

    it('should handle number values in the item', () => {
      const state = createSerializedState([{ label: 'count', value: [123] }]);
      const result = serializeTemplate(state, (item) => {
        const key = item.value.map((v) => String(v)).join('.');
        return demoContext[key] ?? `{${key}}`;
      });
      expect(result).toBe('{123}\n');
    });

    it('should handle empty state', () => {
      const state = { root: { type: 'root', version: 1 } };
      const result = serializeTemplate(
        state as SerializedEditorState<SerializedLexicalNode>,
        () => 'resolver',
      );
      expect(result).toBe('');
    });
  });

  describe('findCustomVariables', () => {
    function createSerializedState(
      variableItems: {
        label: string;
        value: (number | string)[];
        type?: string;
      }[],
    ): SerializedEditorState<SerializedLexicalNode> {
      return {
        root: {
          type: 'root',
          children: variableItems.map((item) => ({
            type: 'paragraph',
            children: [{ type: 'variable', version: 1, item, key: 'mock-key' }],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 1,
            key: `mock-key-${item.label}`,
          })),
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      };
    }

    it('should find custom type variables', () => {
      const state = createSerializedState([
        { label: 'customVar1', value: ['field1'], type: 'custom' },
        { label: 'normalVar', value: ['userId'] },
      ]);
      const result = findCustomVariables(state);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        label: 'customVar1',
        value: ['field1'],
        type: 'custom',
      });
    });

    it('should find multiple custom type variables', () => {
      const state = createSerializedState([
        { label: 'custom1', value: ['a'], type: 'custom' },
        { label: 'normal1', value: ['userId'] },
        { label: 'custom2', value: ['b'], type: 'custom' },
        { label: 'normal2', value: ['userName'] },
      ]);
      const result = findCustomVariables(state);
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'custom1',
        value: ['a'],
        type: 'custom',
      });
      expect(result[1]).toEqual({
        label: 'custom2',
        value: ['b'],
        type: 'custom',
      });
    });

    it('should return empty array when no custom variables', () => {
      const state = createSerializedState([
        { label: 'normalVar', value: ['userId'] },
        { label: 'otherVar', value: ['userName'], type: 'text' },
      ]);
      const result = findCustomVariables(state);
      expect(result).toHaveLength(0);
    });

    it('should return empty array for empty state', () => {
      const state = { root: { type: 'root', version: 1 } };
      const result = findCustomVariables(
        state as SerializedEditorState<SerializedLexicalNode>,
      );
      expect(result).toHaveLength(0);
    });

    it('should handle number values in custom variables', () => {
      const state = createSerializedState([
        { label: 'customCount', value: [123, 456], type: 'custom' },
      ]);
      const result = findCustomVariables(state);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        label: 'customCount',
        value: [123, 456],
        type: 'custom',
      });
    });

    it('should recursively find custom variables in nested paragraphs', () => {
      const state = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              format: '',
              direction: 'ltr',
              indent: 0,
              version: 1,
              key: 'p1',
              children: [
                { type: 'text', text: 'Hello ', version: 1, key: 'k1' },
                {
                  type: 'variable',
                  version: 1,
                  item: {
                    label: 'customNested',
                    value: ['nested'],
                    type: 'custom',
                  },
                  key: 'k2',
                },
              ],
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          version: 1,
        },
      };
      const result = findCustomVariables(
        state as SerializedEditorState<SerializedLexicalNode>,
      );
      expect(result).toHaveLength(1);
      expect(result[0].label).toBe('customNested');
    });
  });
});
