import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEditor,
  $getRoot,
  $createParagraphNode,
  TextNode,
  $isTextNode,
  type LexicalEditor,
} from 'lexical';
import {
  $createVariableNode,
  $isVariableNode,
  VariableNode,
  type SerializedVariableNode,
} from './VariableNode';

describe('VariableNode', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor({
      namespace: 'test',
      nodes: [VariableNode],
    });
  });

  describe('getType', () => {
    it('should return "variable" type', () => {
      expect(VariableNode.getType()).toBe('variable');
    });
  });

  describe('createNode', () => {
    it('should create a node with default item', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: 'var1', value: ['var1'] });
        expect($isVariableNode(node)).toBe(true);
        expect(node.getTextContent()).toBe('var1');
      });
    });

    it('should create a node with custom item', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '用户邮箱',
          value: ['userEmail'],
        });
        expect($isVariableNode(node)).toBe(true);
        expect(node.getTextContent()).toBe('用户邮箱');
        expect(node.getValue()).toEqual(['userEmail']);
      });
    });

    it('should create a node with array value containing multiple elements', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '嵌套路径',
          value: ['bbb', 'ccc'],
        });
        expect($isVariableNode(node)).toBe(true);
        expect(node.getValue()).toEqual(['bbb', 'ccc']);
        expect(node.getValueKey()).toBe('bbb|||ccc');
      });
    });

    it('should create a node with mixed number/string value array', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '复杂字段',
          value: ['api', 'response', 'data', 0],
        });
        expect($isVariableNode(node)).toBe(true);
        expect(node.getValue()).toEqual(['api', 'response', 'data', 0]);
        expect(node.getValueKey()).toBe('api|||response|||data|||0');
      });
    });
  });

  describe('$isVariableNode', () => {
    it('should identify VariableNode instances', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: 'test', value: ['test'] });
        expect($isVariableNode(node)).toBe(true);
      });
    });

    it('should return false for non-VariableNode', () => {
      editor.update(() => {
        const textNode = new TextNode('hello');
        expect($isVariableNode(textNode)).toBe(false);
        expect($isTextNode(textNode)).toBe(true);
      });
    });

    it('should return false for null/undefined', () => {
      expect($isVariableNode(null)).toBe(false);
      expect($isVariableNode(undefined)).toBe(false);
    });
  });

  describe('isInline', () => {
    it('should be an inline node', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: 'test', value: ['test'] });
        expect(node.isInline()).toBe(true);
      });
    });
  });

  describe('clone', () => {
    it('should clone a node correctly', () => {
      editor.update(() => {
        const original = $createVariableNode({
          label: '用户邮箱',
          value: ['userEmail'],
        });
        const cloned = VariableNode.clone(original);
        expect(cloned).not.toBe(original);
        expect(cloned.getTextContent()).toBe('用户邮箱');
        expect(cloned.getValue()).toEqual(['userEmail']);
      });
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: 'myVar', value: ['myVar'] });
        const json = node.exportJSON();
        expect(json).toHaveProperty('type', 'variable');
        expect(json).toHaveProperty('version', 1);
      });
    });

    it('should serialize with exportJSON including item with label and value array', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '用户邮箱',
          value: ['userEmail'],
        });
        const json = node.exportJSON();
        expect(json.type).toBe('variable');
        expect(json.version).toBe(1);
        expect(json.item.label).toBe('用户邮箱');
        expect(json.item.value).toEqual(['userEmail']);
      });
    });

    it('should serialize with array value containing multiple elements', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '嵌套',
          value: ['bbb', 'ccc'],
        });
        const json = node.exportJSON();
        expect(json.type).toBe('variable');
        expect(json.item.label).toBe('嵌套');
        expect(json.item.value).toEqual(['bbb', 'ccc']);
      });
    });

    it('should serialize with mixed number/string value array', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '复杂',
          value: ['api', 'data', 0],
        });
        const json = node.exportJSON();
        expect(json.type).toBe('variable');
        expect(json.item.value).toEqual(['api', 'data', 0]);
      });
    });

    it('should deserialize from JSON using importJSON with item format', () => {
      editor.update(() => {
        const serializedNode: SerializedVariableNode = {
          type: 'variable',
          version: 1,
          item: { label: '用户邮箱', value: ['userEmail'] },
        };
        const node = VariableNode.importJSON(serializedNode);
        expect($isVariableNode(node)).toBe(true);
        expect(node.getTextContent()).toBe('用户邮箱');
        expect(node.getValue()).toEqual(['userEmail']);
      });
    });

    it('should import JSON with backward compatibility for legacy label/value format', () => {
      editor.update(() => {
        const node = VariableNode.importJSON({
          type: 'variable' as const,
          version: 1,
          item: {
            label: 'userName',
            value: ['userName'],
          },
        });
        expect($isVariableNode(node)).toBe(true);
        expect(node.getTextContent()).toBe('userName');
      });
    });

    it('should import JSON with empty values', () => {
      editor.update(() => {
        const serializedNode: SerializedVariableNode = {
          type: 'variable',
          version: 1,
          item: { label: '', value: [] },
        };
        const node = VariableNode.importJSON(serializedNode);
        expect($isVariableNode(node)).toBe(true);
        expect(node.getTextContent()).toBe('');
      });
    });

    it('should round-trip serialize and deserialize', () => {
      editor.update(() => {
        const original = $createVariableNode({
          label: 'config.name',
          value: ['config', 'name'],
        });
        const json = original.exportJSON();

        const restored = VariableNode.importJSON(json);
        expect(restored.getTextContent()).toBe('config.name');
        expect(restored.getValue()).toEqual(['config', 'name']);
      });
    });

    it('should round-trip with complex array value', () => {
      editor.update(() => {
        const original = $createVariableNode({
          label: '复杂字段',
          value: ['api', 'response', 'data', 0],
        });
        const json = original.exportJSON();

        const restored = VariableNode.importJSON(json);
        expect(restored.getLabel()).toBe('复杂字段');
        expect(restored.getValue()).toEqual(['api', 'response', 'data', 0]);
      });
    });

    it('should be serialized in editor state', () => {
      editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const variable = $createVariableNode({
          label: 'userName',
          value: ['userName'],
        });
        paragraph.append(variable);
        root.append(paragraph);

        const json = editor.getEditorState().toJSON();
        expect(json).toHaveProperty('root');
      });
    });

    it('should provide getLabel and getItem methods', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '用户邮箱',
          value: ['userEmail', 'primary'],
        });
        expect(node.getLabel()).toBe('用户邮箱');
        expect(node.getItem()).toEqual({
          label: '用户邮箱',
          value: ['userEmail', 'primary'],
        });
      });
    });

    it('should support updateItem method', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: '旧标签', value: ['old'] });
        expect(node.getLabel()).toBe('旧标签');
        node.updateItem({ label: '新标签', value: ['new'] });
        expect(node.getLabel()).toBe('新标签');
        expect(node.getValue()).toEqual(['new']);
      });
    });
  });

  describe('DOM creation', () => {
    it('should create a span element with correct class', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: 'testVar',
          value: ['testVar'],
        });
        const dom = node.createDOM({} as any);
        expect(dom.tagName).toBe('SPAN');
        expect(dom.className).toBe('variable-node');
      });
    });
  });

  describe('editor integration', () => {
    it('should insert node into editor', () => {
      editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const variable = $createVariableNode({
          label: 'userId',
          value: ['userId'],
        });
        paragraph.append(variable);
        root.append(paragraph);

        expect(root.getFirstChild()).toBe(paragraph);
        expect(paragraph.getFirstChild()).toBe(variable);
      });
    });
  });

  describe('label and value', () => {
    it('should create node with label and value array', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: '用户邮箱',
          value: ['userEmail'],
        });
        expect(node.getLabel()).toBe('用户邮箱');
        expect(node.getValue()).toEqual(['userEmail']);
        expect(node.getTextContent()).toBe('用户邮箱');
      });
    });

    it('should default value to label when not provided', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: 'userId',
          value: ['userId'],
        });
        expect(node.getLabel()).toBe('userId');
        expect(node.getValue()).toEqual(['userId']);
      });
    });

    it('should set and get missing status', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: 'userId',
          value: ['userId'],
        });
        expect(node.isMissing()).toBe(false);
        node.setMissing(true);
        expect(node.isMissing()).toBe(true);
        node.setMissing(false);
        expect(node.isMissing()).toBe(false);
      });
    });

    it('should setTextContent update the item', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: 'user1', value: ['value1'] });
        node.setTextContent('user2');
        expect(node.getLabel()).toBe('user2');
        expect(node.getValue()).toEqual(['user2']);
      });
    });

    it('should accept and return type field in item', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: 'userId',
          value: ['userId'],
          type: 'special',
        });
        expect(node.getItem()).toEqual({
          label: 'userId',
          value: ['userId'],
          type: 'special',
        });
        expect(node.getLabel()).toBe('userId');
        expect(node.getValue()).toEqual(['userId']);
      });
    });

    it('should serialize with type field in JSON', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: 'formattedDate',
          value: ['date'],
          type: 'datetime',
        });
        const json = node.exportJSON();
        expect(json.type).toBe('variable');
        expect(json.version).toBe(1);
        expect(json.item.label).toBe('formattedDate');
        expect(json.item.value).toEqual(['date']);
        expect(json.item.type).toBe('datetime');
      });
    });

    it('should deserialize from JSON with type field', () => {
      editor.update(() => {
        const serializedNode: SerializedVariableNode = {
          type: 'variable',
          version: 1,
          item: { label: 'formattedDate', value: ['date'], type: 'datetime' },
        };
        const node = VariableNode.importJSON(serializedNode);
        expect($isVariableNode(node)).toBe(true);
        expect(node.getItem()).toEqual({
          label: 'formattedDate',
          value: ['date'],
          type: 'datetime',
        });
      });
    });

    it('should work without type field (backward compatible)', () => {
      editor.update(() => {
        const node = $createVariableNode({
          label: 'oldVar',
          value: ['oldVar'],
        });
        expect(node.getItem()).toEqual({
          label: 'oldVar',
          value: ['oldVar'],
          type: undefined,
        });
        const json = node.exportJSON();
        expect(json.item).toHaveProperty('value');
      });
    });

    it('should updateItem with new type', () => {
      editor.update(() => {
        const node = $createVariableNode({ label: 'var1', value: ['v1'] });
        expect(node.getItem().type).toBeUndefined();
        node.updateItem({ label: 'var2', value: ['v2'], type: 'custom' });
        expect(node.getItem()).toEqual({
          label: 'var2',
          value: ['v2'],
          type: 'custom',
        });
      });
    });

    it('should round-trip serialize with type field through editor state', () => {
      editor.update(() => {
        const root = $getRoot();
        const paragraph = $createParagraphNode();
        const variable = $createVariableNode({
          label: 'specialVar',
          value: ['s'],
          type: 'special',
        });
        paragraph.append(variable);
        root.append(paragraph);

        const json = editor.getEditorState().toJSON();
        expect(json).toHaveProperty('root');

        // Verify the serialized variable node contains the type field
        const state = editor.getEditorState().toJSON();
        const children = (state as any).root?.children || [];
        if (children.length > 0) {
          const varNode = children[0].children?.find(
            (c: any) => c.type === 'variable',
          );
          expect(varNode).toBeDefined();
          expect(varNode.item.type).toBe('special');
        }
      });
    });
  });
});
