import { select } from '@inquirer/prompts';
import { isExitPromptError } from './utils';

export async function getTemplateType(): Promise<'javascript' | 'typescript'> {
  try {
    return (await select({
      message: 'Which language would you like to use?',
      choices: [
        {
          value: 'typescript',
          name: 'TypeScript',
          description: 'Strongly typed JavaScript (recommended)',
        },
        {
          value: 'javascript',
          name: 'JavaScript',
          description: 'Plain JavaScript',
        },
      ],
      default: 'typescript',
    })) as 'javascript' | 'typescript';
  } catch (error) {
    if (isExitPromptError(error)) {
      console.log('\nOperation cancelled');
    }
    throw error;
  }
}
