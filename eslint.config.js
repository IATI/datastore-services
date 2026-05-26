import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
    js.configs.recommended,
    importPlugin.flatConfigs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            'no-console': 'off',
            'import/extensions': ['warn', 'ignorePackages'],
            'import/no-unresolved': 'off',
        },
    },
    prettier,
];
