# GitHub Copilot Instructions for TypeScript and JavaScript Projects

These instructions help GitHub Copilot generate code that aligns with our team's standards and avoids common issues in JavaScript and TypeScript development.

---

## ✅ General Guidelines

- Use only officially supported JavaScript and TypeScript APIs.
- Avoid suggesting third-party libraries unless explicitly listed in `package.json`.
- Prefer native language features over external utilities.

---

## 🛡️ Common Issue Prevention Checks

### 1. Official API Usage

- Only use officially supported JavaScript/TypeScript APIs and Node.js built-in modules
- Avoid experimental, deprecated, or non-standard APIs
- Verify API availability in the target Node.js version before suggesting
- Prefer stable, documented APIs over cutting-edge features

### 2. Type Safety (TypeScript)

- Avoid any types and type assertions without justification
- Prefer proper typing and type guards for unknown data

### 3. Null/Undefined Safety

- Avoid unsafe property access that could throw errors
- Prefer safe navigation with optional chaining and nullish coalescing

### 4. Error Handling

- Avoid ignoring errors or using generic catch blocks
- Prefer explicit error handling with proper typing and meaningful error messages

### 5. Async/Await Best Practices

- Avoid Promise constructor anti-patterns and missing error handling
- Prefer proper async patterns with comprehensive error handling

### 6. Array and Object Operations

- Avoid mutating operations and unsafe array access
- Prefer immutable operations and safe access patterns

### 7. Function Parameters and Return Types

- Avoid unclear parameter types and missing return types
- Prefer explicit types and input validation

### 8. Variable Declarations

- Avoid var declarations and unnecessary let usage
- Prefer const by default, let only when reassignment is needed

### 9. Comparison Operations

- Avoid loose equality and implicit boolean conversions
- Prefer strict equality and explicit checks

### 10. Memory Leaks Prevention

- Avoid unremoved event listeners and unclosed resources
- Prefer proper cleanup patterns and resource management

### 11. Performance Considerations

- Avoid unnecessary operations in loops and inefficient patterns
- Prefer optimized patterns and consider memoization for expensive operations

---

## 📋 Code Review Checklist

Before suggesting code, ensure:

- [ ] Only official APIs and standard library features are used
- [ ] All variables have appropriate types (TypeScript)
- [ ] Null/undefined safety is handled
- [ ] Errors are properly caught and handled
- [ ] No memory leaks (event listeners, timers, etc.)
- [ ] Functions have single responsibility
- [ ] No magic numbers or strings (use constants)
- [ ] Async operations are properly awaited
- [ ] Arrays/objects are not mutated unexpectedly
- [ ] Performance implications are considered
- [ ] Code follows existing project patterns

---

## 🚀 Modern JavaScript/TypeScript Features to Prefer

- Optional chaining (`?.`) and nullish coalescing (`??`)
- Destructuring assignment for cleaner code
- Template literals instead of string concatenation
- Arrow functions for short, pure functions
- `const` assertions for immutable data
- `satisfies` operator for type checking without widening
- `Record<K, V>` for object types with known keys
