import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'playwright-report', 'test-results']),
  // 测试文件规则（更宽松）
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',  // 测试中未使用的导入是正常的
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
  // 主要源码规则
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // ==================== TypeScript 自动修复规则 ====================

      // ✅ 统一使用 type import (e.g. import type { Foo } from 'bar')
      // 避免运行时导入不必要的类型
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],

      // ✅ 禁止使用 explicit any，推荐使用 unknown 或具体类型
      '@typescript-eslint/no-explicit-any': 'warn',

      // ✅ 禁止多余的 non-null 断言
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // ✅ 禁止使用 tslint 注释
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description' },
      ],

      // ✅ 一致的类型定义风格：使用 interface 而非 type（除非需要联合/交叉类型）
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],

      // ✅ 对象索引签名风格：使用 index signature
      '@typescript-eslint/consistent-indexed-object-style': ['error', 'index-signature'],

      // ✅ 禁止空函数
      'no-empty-function': 'warn',

      // ⚠️ 需要类型信息才能检查，暂不启用（需配置 tsconfig.excludedFiles）
      // '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // ⚠️ 需要类型信息
      // '@typescript-eslint/no-meaningless-void-operator': 'error',

      // ⚠️ 需要类型信息
      // '@typescript-eslint/no-redundant-type-constituents': 'error',

      // ✅ 要求 inferrable 类型时使用显式声明
      '@typescript-eslint/no-inferrable-types': [
        'error',
        { ignoreParameters: true, ignoreProperties: true },
      ],

      // ✅ 禁止变量阴影
      '@typescript-eslint/no-shadow': 'error',

      // ==================== no-unused-vars 配置 ====================
      // 以下划线开头的变量视为有意未使用（占位符、接口实现等）
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',           // 函数参数以 _ 开头允许不使用时
          vars: 'all',
          varsIgnorePattern: '^_', // 忽略 _ 开头的变量
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
         destructuredArrayIgnorePattern: '^_',
        },
      ],

      // ==================== React Refresh 配置 ====================
      // 允许非组件导出（Lexical 节点插件等场景）
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['lexicalEditor'] },
      ],

      // ==================== 异步/Promise 相关 ====================

      // ⚠️ 需要类型信息，暂不启用
      // '@typescript-eslint/await-thenable': 'error',

      // ⚠️ 需要类型信息
      // '@typescript-eslint/no-floating-promises': ['warn'],
      // '@typescript-eslint/no-misused-promises': ['warn'],

      // ==================== React 相关 ====================

      // ✅ JSX 属性使用双引号
      'jsx-quotes': ['error', 'prefer-double'],

      // ==================== 代码风格自动修复 ====================

      // ✅ 禁止行尾空格
      'no-trailing-spaces': 'error',

      // ✅ 文件末尾必须有换行符
      'eol-last': 'error',

      // ✅ 禁用不必要的 console
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // ✅ 禁用 debugger
      'no-debugger': 'error',

       // ✅ 禁用未使用的表达式（但保留 side-effect imports）
      'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],

      // ✅ 允许 Object.prototype 方法调用（Lexical 序列化场景需要）
      'no-prototype-builtins': 'warn',

      // ==================== TypeScript 警告级别（不自动修复）====================

      // 要求函数有返回类型声明
      '@typescript-eslint/explicit-function-return-type': 'off',

      // 要求模块边界类型声明
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  // E2E 测试文件规则（放在最后，覆盖主配置）
  {
    files: ['e2e/**/*.ts'],
    rules: {
      'no-control-regex': 'off',            // e2e 测试中需要匹配控制字符
      'no-console': 'off',                  // 允许 console
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
])
