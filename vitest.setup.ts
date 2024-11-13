import { vi, beforeEach, afterAll } from 'vitest';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock process.exit
const mockExit = vi.fn();
vi.spyOn(process, 'exit').mockImplementation(mockExit as any);

// Mock console methods
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});

// Clean up after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
