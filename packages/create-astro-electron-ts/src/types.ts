import type { OptionValues } from 'commander';

export interface CreateOptions extends OptionValues {
  typescript: boolean;
  install: boolean;
}
