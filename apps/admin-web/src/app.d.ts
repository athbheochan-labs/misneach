declare global {
  namespace App {
    interface Locals {
      auth: {
        userId: number;
        clientId: string;
        sessionId: string;
        email?: string;
        role?: 'learner' | 'admin';
      } | null;
    }

    interface PageData {
      auth: App.Locals['auth'];
    }
  }
}

export {};
