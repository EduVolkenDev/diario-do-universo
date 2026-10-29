import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

// Test-only TypeScript loader. No compiled tests or harness enter the app bundle.
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith('.') && context.parentURL) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return { url: candidate.href, shortCircuit: true };
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (process.env.DIARY_TEST_AUTH === 'mock' && new URL(url).pathname.endsWith('/src/lib/supabase-browser.ts')) {
      return { format: 'module', shortCircuit: true, source: 'export const supabase = globalThis.diaryTestClient;' };
    }
    if (new URL(url).pathname.endsWith('.ts')) {
      const source = readFileSync(new URL(url), 'utf8');
      return { format: 'module', shortCircuit: true, source: stripTypeScriptTypes(source) };
    }
    return next(url, context);
  },
});
