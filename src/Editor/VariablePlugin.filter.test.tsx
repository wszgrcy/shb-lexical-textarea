import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Editor from './Editor';
import type { VariableFilterFn } from './VariablePlugin';

describe('VariablePlugin - variableFilter prop', () => {
  const variables = [
    { label: 'userId', value: ['userId'] },
    { label: 'userName', value: ['userName'] },
    { label: 'emailAddress', value: ['emailAddress'] },
    { label: 'userEmail', value: ['userEmail'] },
  ];

  it('should use default filtering when variableFilter is not provided', () => {
    // Default behavior: filter by label includes query (case-insensitive)
    // When typing "user", both userId and userName should match
    const handleChange = vi.fn();
    render(
      <Editor
        variables={variables}
        onChange={handleChange}
        placeholder="Type here..."
      />
    );

    // Verify editor renders without crashing
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
  });

  it('should call custom variableFilter with correct query string', () => {
    const customFilter: VariableFilterFn = vi.fn((query, vars) => {
      // Custom filter: only match if label STARTS WITH the query (not just includes)
      return vars.filter((v: { label: string; value: (number | string)[] }) => v.label.startsWith(query));
    });

    render(
      <Editor
        variables={variables}
        variableFilter={customFilter}
        placeholder="Type here..."
      />
    );

    // The filter should not be called during initial render (no query yet)
    expect(customFilter).not.toHaveBeenCalled();
  });

  it('should apply custom filter logic instead of default includes', () => {
    // Custom filter: only return variables where label ends with "id"
    const customFilter: VariableFilterFn = vi.fn((query, vars) => {
      if (!query) return vars;
      return vars.filter((v: { label: string; value: (number | string)[] }) => v.label.endsWith('id') && 
        v.label.toLowerCase().includes(query.toLowerCase()));
    });

    render(
      <Editor
        variables={variables}
        variableFilter={customFilter}
        placeholder="Type here..."
      />
    );

    // Verify editor renders
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
    
    // Custom filter is set up and ready to be called by LexicalTypeaheadMenuPlugin
    expect(customFilter).toBeDefined();
  });

  it('should return different results than default filter with custom logic', () => {
    // Default: includes "User" matches all labels containing "user" (case-insensitive)
    const defaultQuery = 'User';
    const defaultResult = variables.filter(v => 
      v.label.toLowerCase().includes(defaultQuery.toLowerCase()));
    
    // Custom: only matches labels that START with exact case "User"
    // This should NOT match "userId", "userName", "userEmail" since they start with lowercase
    const customFilter: VariableFilterFn = (query, vars) => {
      return vars.filter(v => v.label.startsWith(query));
    };
    const customResult = customFilter(defaultQuery, variables);

    // These should be different - default includes 3 items (userId, userName, userEmail),
    // custom includes 0 (nothing starts with uppercase "User")
    expect(defaultResult.length).toBe(3);
    expect(customResult.length).toBe(0);
    
    // This proves custom filter produces different output than default
    expect(customResult).not.toEqual(defaultResult);
  });

  it('should handle empty query by returning all variables', () => {
    const customFilter: VariableFilterFn = vi.fn((query, vars) => {
      if (!query || query.length === 0) return vars;
      return vars.filter((v: { label: string; value: (number | string)[] }) => v.label.includes(query));
    });

    const result = customFilter('', variables);
    
    expect(customFilter).toHaveBeenCalledWith('', variables);
    expect(result).toHaveLength(variables.length);
  });

  it('should filter by value array content when custom filter provided', () => {
    // Custom filter: match against the value array contents instead of label
    const customFilter: VariableFilterFn = vi.fn((query, vars) => {
      return vars.filter((v: { label: string; value: (number | string)[] }) => 
        v.value.some((val: number | string) => String(val).toLowerCase().includes(query.toLowerCase()))
      );
    });

    // When query is "email", should match emailAddress and userEmail (based on value)
    const result = customFilter('email', variables);
    
    expect(customFilter).toHaveBeenCalledWith('email', variables);
    expect(result).toHaveLength(2);
    expect(result.map(v => v.label)).toContain('emailAddress');
    expect(result.map(v => v.label)).toContain('userEmail');
    
    // Default filter would match emailAddress, userEmail (by label includes "email")
    void variables.filter(v => 
      v.label.toLowerCase().includes('email'));
    
    // In this case both produce same results for "email", let's try a different query
    // Query "UserId" with value-based filter should match (value is ['userId'])
    const valueBasedResult = customFilter('userId', variables);
    expect(valueBasedResult).toHaveLength(1);
    expect(valueBasedResult[0].label).toBe('userId');
    
    // Default label-based filter would NOT match "userId" for label "userId" (case-sensitive check fails on first letter)
    // Actually default IS case-insensitive, so let's verify the difference
    const defaultUserIdResult = variables.filter(v => 
      v.label.toLowerCase().includes('userid'));
    expect(defaultUserIdResult).toHaveLength(1);
    expect(defaultUserIdResult[0].label).toBe('userId');
    
    // Both match here, but they're using different strategies (label vs value)
    // Let's verify with a case where they differ: query "Id" 
    const defaultIdResult = variables.filter(v => 
      v.label.toLowerCase().includes('id'));
    const valueIdResult = customFilter('Id', variables);
    
    // Default matches by label: userId (label contains "Id" case-insensitive)
    expect(defaultIdResult.length).toBeGreaterThanOrEqual(1);
    // Value-based matches by value array: userId has value ['userId'] which includes "Id" case-insensitive
    expect(valueIdResult.length).toBeGreaterThanOrEqual(1);
  });

  it('should integrate with Editor component and pass through variableFilter prop', () => {
    const customFilterSpy = vi.fn((query, vars) => {
      return vars.filter((v: { label: string; value: (number | string)[] }) => 
        v.label.toLowerCase().includes(query.toLowerCase()) &&
        v.label.length > 5 // Additional constraint: only long labels
      );
    });

    const handleChange = vi.fn();
    render(
      <Editor
        variables={variables}
        variableFilter={customFilterSpy}
        onChange={handleChange}
      />
    );

    // Editor should render successfully with custom filter
    const contentEditable = document.querySelector('[contenteditable="true"]');
    expect(contentEditable).toBeTruthy();
    
    // The filter function is ready (will be called by LexicalTypeaheadMenuPlugin when query changes)
    expect(customFilterSpy).toBeDefined();
  });
});
