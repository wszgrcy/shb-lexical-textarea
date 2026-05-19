import { describe, it, expect } from 'vitest';
import {
  type SerializedEditorState,
  type SerializedLexicalNode,
} from 'lexical';
import { serializeTemplate } from './VariableSerialization';

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
      const state: SerializedEditorState<SerializedLexicalNode> = { root: {} };
      const result = serializeTemplate(state, () => 'resolver');
      expect(result).toBe('');
    });
  });
});
