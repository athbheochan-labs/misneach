declare global {
  namespace App {
    interface Locals {
      auth: {
        userId: number;
        clientId: string;
        sessionId: string;
        email?: string;
        role?: 'learner' | 'admin';
        signupComplete?: boolean;
      } | null;
      previewToken?: string | null;
    }

    interface PageData {
      auth: App.Locals['auth'];
    }
  }
}

export {};
