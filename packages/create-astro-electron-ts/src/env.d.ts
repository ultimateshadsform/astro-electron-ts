declare namespace NodeJS {
  interface ProcessEnv {
    VERSION?: string;
    APP_NAME?: string;
    APP_DESCRIPTION?: string;
    [key: string]: string | undefined;
  }
}
