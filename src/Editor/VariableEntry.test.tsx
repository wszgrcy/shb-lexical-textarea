import { describe, it, expect } from 'vitest';
import type { VariableEntry } from './VariablePlugin';

describe('VariableEntry - object format', () => {
  /** Extract label from VariableEntry (copies VariablePlugin logic). */
  function getLabel(entry: VariableEntry): string {
    return entry.label;
  }

  /** Extract item from VariableEntry (copies VariablePlugin logic). */
  function getItem(entry: VariableEntry): {
    label: string;
    value: (number | string)[];
  } {
    return { label: entry.label, value: entry.value };
  }

  it('should handle object with string array value', () => {
    const entry: VariableEntry = { label: '用户邮箱', value: ['userEmail'] };
    expect(getLabel(entry)).toBe('用户邮箱');
    expect(getItem(entry)).toEqual({ label: '用户邮箱', value: ['userEmail'] });
  });

  it('should handle object with number value', () => {
    const entry: VariableEntry = { label: '数字值', value: [123] };
    expect(getLabel(entry)).toBe('数字值');
    expect(getItem(entry)).toEqual({ label: '数字值', value: [123] });
  });

  it('should handle object with mixed array value', () => {
    const entry: VariableEntry = { label: '嵌套路径', value: ['bbb', 'ccc'] };
    expect(getLabel(entry)).toBe('嵌套路径');
    expect(getItem(entry)).toEqual({
      label: '嵌套路径',
      value: ['bbb', 'ccc'],
    });
  });

  it('should handle object with complex nested path', () => {
    const entry: VariableEntry = {
      label: '复杂字段',
      value: ['api', 'response', 'data', 0],
    };
    expect(getLabel(entry)).toBe('复杂字段');
    expect(getItem(entry)).toEqual({
      label: '复杂字段',
      value: ['api', 'response', 'data', 0],
    });
  });

  it('should handle object with simple single value', () => {
    const entry: VariableEntry = { label: 'userId', value: ['userId'] };
    expect(getLabel(entry)).toBe('userId');
    expect(getItem(entry)).toEqual({ label: 'userId', value: ['userId'] });
  });

  it('should handle multiple entries in array', () => {
    const entries: VariableEntry[] = [
      { label: 'userId', value: ['userId'] },
      { label: '用户邮箱', value: ['userEmail'] },
      { label: '数字值', value: [123] },
    ];

    expect(getLabel(entries[0])).toBe('userId');
    expect(getLabel(entries[1])).toBe('用户邮箱');
    expect(getLabel(entries[2])).toBe('数字值');
  });
});
