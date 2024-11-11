import { beforeAll } from 'vitest';

beforeAll(() => {
  // Mock URL since it's not available in Node test environment
  global.URL = class extends URL {
    constructor(url: string) {
      super(url);
    }
    get pathname() {
      return this.toString();
    }
  } as any;
});
