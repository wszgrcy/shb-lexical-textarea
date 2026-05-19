import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEditor,
  $getRoot,
  $createParagraphNode,
  TextNode,
  type LexicalEditor,
} from 'lexical';
import {
  $createVariableNode,
  VariableNode,
  $isVariableNode,
} from '../nodes/VariableNode';

/**
 * VariablePlugin - node replacement workflow tests.
 * Tests the core mechanism: split text at @query boundaries and replace with VariableNode.
 */
describe('VariablePlugin - node replacement workflow', () => {
  let editor: LexicalEditor;

  beforeEach(() => {
    editor = createEditor({
      namespace: 'test',
      nodes: [VariableNode],
    });
  });

  it('should replace isolated @query text with variable node', () => {
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();

      // Simple case: node contains only "@user" which will be replaced
      const queryNode = new TextNode('@user');
      paragraph.append(queryNode);
      root.append(paragraph);

      // Create variable node and replace
      const variableNode = $createVariableNode({
        label: 'userId',
        value: ['userId'],
      });

      queryNode.replace(variableNode);

      // Verify: the paragraph should now have only the variable node
      expect(paragraph.getFirstChild()).toBe(variableNode);
      expect($isVariableNode(variableNode)).toBe(true);
      expect(variableNode.getTextContent()).toBe('userId');
    });
  });

  it('should properly split text and replace middle portion with variable node', () => {
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();

      // Text: "hello @user world"
      const textNode = new TextNode('hello @user world');
      paragraph.append(textNode);
      root.append(paragraph);

      // Step 1: split at position 6 (the @ character)
      // This gives ["hello ", "@user world"]
      const [leftPart, rightAfterAt] = textNode.splitText(6);

      expect(leftPart!.getTextContent()).toBe('hello ');
      expect(rightAfterAt!.getTextContent()).toBe('@user world');

      // Step 2: split rightAfterAt at position 5 (end of "@user" before space)
      // This gives ["@user", " world"]
      const [, rightPart] = rightAfterAt!.splitText(5);

      expect(rightPart!.getTextContent()).toBe(' world');
      expect(rightAfterAt.getTextContent()).toBe('@user');

      // Step 3: Replace the @user portion with variable node
      const variableNode = $createVariableNode({
        label: 'userId',
        value: ['userId'],
      });
      rightAfterAt.replace(variableNode);

      // Verify final structure: "hello " + userId + " world"
      const children = paragraph.getChildren();
      expect(children.length).toBe(3);
      expect(children[0].getTextContent()).toBe('hello ');
      expect($isVariableNode(children[1])).toBe(true);
      expect(children[1].getTextContent()).toBe('userId');
      expect(children[2].getTextContent()).toBe(' world');
    });
  });

  it('should handle split when @ is at position 0', () => {
    editor.update(() => {
      const root = $getRoot();
      const paragraph = $createParagraphNode();

      // Text: "@query some text" (@ at position 0)
      const textNode = new TextNode('@query some text');
      paragraph.append(textNode);
      root.append(paragraph);

      // Since @ is at position 0, no left part needed
      // Split at position 6 (end of "@query", i.e., after the "@" and "query")
      // When split starts from a node that already begins with matching text,
      // Lexical returns [textNode] where textNode is mutated to contain only the matched portion.
      const splitResult = textNode.splitText(6);
      const matchedPart = splitResult[0];

      expect(matchedPart!.getTextContent()).toBe('@query');
      // After split, the original textNode is now the "left" portion when @ is at position 0
      // and Lexical doesn't create a new node — it mutates in place.
      // So matchedPart IS textNode (same reference), both showing "@query".
      expect(matchedPart).toBe(textNode);
    });
  });

  it('should handle variable node being an inline node', () => {
    editor.update(() => {
      const variableNode = $createVariableNode({
        label: 'test',
        value: ['test'],
      });
      expect(variableNode.isInline()).toBe(true);
    });
  });
});
