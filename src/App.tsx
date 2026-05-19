import { useState, useCallback } from 'react';
import Editor from './Editor/Editor';
import { serializeTemplate } from './Editor';
import './App.css';
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical';
import './Editor/Editor.css';

// Demo context for serializing variables to strings
const demoContext: { [key: string]: string } = {
  userId: 'user-123',
  userName: '张三',
  userEmail: 'zhangsan@example.com',
  config: '{"theme":"dark"}',
  data: 'some-data',
  items: 'item1,item2',
  count: '42',
  title: '我的标题',
  description: '这是一个描述',
  'bbb.ccc': 'nested-value',
  'api.response.data.0': 'api-result',
};

/** Resolve a VariableItem to its display string using the demo context. */
function resolveVariable(item: {
  label: string;
  value: (number | string)[];
  type?: string;
}): string {
  // Type-aware resolution: if type is set, apply custom formatting
  if (item.type === 'special') {
    return `【${item.label}】`;
  }
  // By default, join value array into a dot-separated key and look up in context
  const key = item.value.map((v) => String(v)).join('.');
  return demoContext[key] ?? `{${key}}`;
}

function App() {
  const [editorState, setEditorState] =
    useState<SerializedEditorState<SerializedLexicalNode> | null>(null);
  const [variables, setVariables] = useState<
    Array<{ label: string; value: (number | string)[]; type?: string }>
  >([
    { label: 'userId', value: ['userId'] },
    { label: 'userName', value: ['userName'] },
    { label: '用户邮箱', value: ['userEmail'] },
    { label: 'config', value: ['config'] },
    { label: '数据对象', value: ['data'] },
    { label: 'items', value: ['items'] },
    { label: '数字值', value: [123] },
    { label: 'count', value: ['count'] },
    { label: '嵌套路径', value: ['bbb', 'ccc'] },
    { label: '复杂字段', value: ['api', 'response', 'data', 0] },
    { label: 'specialVar', value: ['specialVar'], type: 'special' },
  ]);

  const handleChange = useCallback(
    (state: SerializedEditorState<SerializedLexicalNode>) => {
      setEditorState(state);
    },
    [],
  );

  // Demo button handlers
  const handleClearVariables = () => {
    setVariables([]);
  };

  const handleResetVariables = () => {
    setVariables([
      { label: 'userId', value: ['userId'] },
      { label: 'userName', value: ['userName'] },
      { label: '用户邮箱', value: ['userEmail'] },
      { label: 'config', value: ['config'] },
      { label: '数据对象', value: ['data'] },
      { label: 'items', value: ['items'] },
      { label: '数字值', value: [123] },
      { label: 'count', value: ['count'] },
      { label: '嵌套路径', value: ['bbb', 'ccc'] },
      { label: '复杂字段', value: ['api', 'response', 'data', 0] },
      { label: 'specialVar', value: ['specialVar'], type: 'special' },
    ]);
  };

  const handleSetRandomValue = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const randomState: any = {
      root: {
        children: [
          {
            children: [
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                text: '手动设置: ',
                type: 'text',
                version: 1,
              },
              {
                detail: 0,
                format: 0,
                mode: 'normal',
                style: '',
                type: 'variable',
                version: 1,
                item: { label: 'randomField', value: ['random', 'field', 99] },
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
    setEditorState(randomState);
  };

  const handleReset = () => {
    setEditorState(null);
  };

  // Serialize the current state to a resolved string using the resolver function
  const resolvedString = editorState
    ? serializeTemplate(editorState, resolveVariable)
    : '';

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h3>变量编辑器</h3>
      <p style={{ fontSize: '13px', color: '#666', marginTop: 0 }}>
        💡 输入 @ 触发变量引用
      </p>
      {/* Demo buttons */}
      <div
        style={{
          marginBottom: '12px',
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={handleClearVariables}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
          }}
        >
          ⚠️ 清空 variables (空数组)
        </button>
        <button
          onClick={handleResetVariables}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            background: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '4px',
          }}
        >
          🔄 重置 variables
        </button>
        <button
          onClick={handleSetRandomValue}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            background: '#d4edda',
            border: '1px solid #c3e6cb',
            borderRadius: '4px',
          }}
        >
          🎲 手动设置值 (random)
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            cursor: 'pointer',
            background: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
          }}
        >
          ❌ 重置编辑器状态
        </button>
      </div>
      {/* Status indicator */}
      <p
        style={{
          fontSize: '12px',
          color: variables.length === 0 ? '#dc3545' : '#666',
          margin: '0 0 8px 0',
        }}
      >
        {variables.length === 0
          ? '⚠️ 当前 variables 为空 (没有可用变量)'
          : `📦 当前可用变量: ${variables.length} 个`}
      </p>
      <Editor
        value={editorState || undefined}
        onChange={handleChange}
        variables={variables}
        placeholder="输入一些内容... (试试输入 @)"
      />
      {editorState && (
        <>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '13px', color: '#666' }}>
              原始 JSON 状态:
            </label>
            <code
              style={{
                background: '#f0f0f0',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'block',
                marginTop: '4px',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {JSON.stringify(editorState, null, 2)}
            </code>
          </div>
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '13px', color: '#666' }}>
              序列化后 (resolved):
            </label>
            <code
              style={{
                background: '#e8f5e9',
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'block',
                marginTop: '4px',
                fontSize: '13px',
                whiteSpace: 'pre',
              }}
            >
              {resolvedString}
            </code>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
