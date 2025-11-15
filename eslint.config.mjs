import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // Custom rules for better code quality
  {
    rules: {
      // TypeScript specific
      "@typescript-eslint/no-explicit-any": "warn", // Discourage 'any' type
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_", // Allow unused vars starting with _
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports" }, // Use 'import type' for types
      ],

      // React specific
      "react/self-closing-comp": "warn", // Use self-closing tags when possible
      "react/jsx-boolean-value": ["warn", "never"], // Omit 'true' in JSX props
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // General code quality
      "no-console": ["warn", { allow: ["warn", "error"] }], // Allow console.warn/error only
      "prefer-const": "error", // Use const when variable is not reassigned
      "no-var": "error", // No var, use let/const
      eqeqeq: ["error", "always"], // Require === and !==
      "no-debugger": "error",
      "no-duplicate-imports": "error",

      "sort-imports": [
        "warn",
        {
          ignoreCase: true,
          ignoreDeclarationSort: true, // Don't sort import declarations (not auto-fixable)
          ignoreMemberSort: false, // Sort members alphabetically (auto-fixable)
          memberSyntaxSortOrder: ["none", "all", "multiple", "single"],
          allowSeparatedGroups: true,
        },
      ],

      // Code style
      "padding-line-between-statements": [
        "warn",
        { blankLine: "always", prev: "*", next: "return" }, // Blank line before return
        { blankLine: "always", prev: ["const", "let"], next: "*" },
        { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
      ],

      // Async/await best practices
      "require-await": "warn", // Ensure async functions have await
      "no-return-await": "error", // Don't use 'return await'

      // Next.js specific
      "@next/next/no-img-element": "warn", // Use next/image instead of img
      "@next/next/no-html-link-for-pages": "warn",
    },
  },

  // Override default ignores of eslint-config-next
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores
    "node_modules/**",
    "dist/**",
    ".cache/**",
    "public/**",
    "*.config.js",
    "*.config.mjs",
  ]),
]);

export default eslintConfig;
