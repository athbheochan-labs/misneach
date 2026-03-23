// src/phrasebook/phrasebook.service.ts
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UpdatePhraseDto } from './phrasebook.dto';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';

export interface PhrasebookStatement {
  id: string;
  text: string;
  source?: string;
  translation?: string | null;
  pronunciation?: string | null;
  example?: string | null;
  notes?: string | null;
  inPractice?: boolean;
  inFlashcards?: boolean;
  tokens?: Array<{
    position: number;
    surface: string;
    lemma: string;
    pos: string;
  }>;
}

@Injectable()
export class PhrasebookService {
  private phrasebookUrl = process.env.PHRASEBOOK_URL || 'http://phrasebook:3011';

  private sseClients: Array<{ clientId: string; res: any }> = [];

  constructor(
    private readonly authService: AuthService,
  ) {}

  // ---------------- SSE ----------------

  registerSseClient(clientId: string, res: any) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    res.write(': connected\n\n');

    const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
    this.sseClients.push({ clientId, res });

    res.on('close', () => {
      clearInterval(keepAlive);
      this.sseClients = this.sseClients.filter((c) => c.res !== res);
    });
  }

  broadcastUpdate(payload: any) {
    const data = JSON.stringify(payload);
    this.sseClients
      .filter((client) => client.clientId === payload?.clientId)
      .forEach((client) =>
        client.res.write(`data: ${data}\n\n`),
      );
  }

  // ---------------- CRUD ----------------

  async getPhrasebook(clientId: string) {
    const res = await fetch(
      `${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}`,
    );
    return res.json();
  }

  async getPhrase(id: string) {
    const res = await fetch(`${this.phrasebookUrl}/phrases/${id}`);
    return res.json();
  }

  async createPhrase(req: AuthenticatedRequest, body: UpdatePhraseDto) {
    const clientId = await this.authService.getClientIdFromSession(req);
    const user = await this.authService.findUserByClientId(clientId);
    const language = user?.languageSettings?.[0]?.targetLanguage ?? 'ga';
    const requestId = randomUUID();
    const autoTranslation =
      typeof body?.autoTranslate === 'boolean' ? body.autoTranslate : undefined;

    const source =
      typeof body?.source === 'string' && body.source.trim().length > 0
        ? body.source.trim()
        : 'own';

    const res = await fetch(
      `${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language,
          source,
          ...body,
          ...(typeof autoTranslation === 'boolean' ? { autoTranslation } : {}),
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to create phrase');
    }

    const phrase = await res.json();
    this.broadcastUpdate({
      type: 'phrase.created',
      requestId,
      clientId,
      phraseId: phrase?.id,
      phrase,
      status: 'completed',
      timestamp: Date.now(),
    });

    return { accepted: true, requestId };
  }

  async updatePhrase(id: string, clientId: string, body: UpdatePhraseDto) {
    const requestId = randomUUID();
    const res = await fetch(`${this.phrasebookUrl}/phrases/${Number(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to update phrase');
    }

    const phrase = await res.json();
    this.broadcastUpdate({
      type: 'phrase.updated',
      requestId,
      clientId,
      phraseId: Number(id),
      phrase,
      status: 'completed',
      timestamp: Date.now(),
    });

    return { accepted: true, requestId };
  }

  async deletePhrase(id: string, clientId: string) {
    const requestId = randomUUID();
    const res = await fetch(`${this.phrasebookUrl}/phrases/${Number(id)}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to delete phrase');
    }

    this.broadcastUpdate({
      type: 'phrase.deleted',
      requestId,
      clientId,
      phraseId: Number(id),
      status: 'completed',
      timestamp: Date.now(),
    });

    return { accepted: true, requestId };
  }

  async generateTranslation(id: string, clientId: string) {
    const requestId = randomUUID();

    this.broadcastUpdate({
      type: 'phrase.translation.requested',
      requestId,
      clientId,
      phraseId: Number(id),
      status: 'accepted',
      timestamp: Date.now(),
    });

    const res = await fetch(
      `${this.phrasebookUrl}/phrases/${Number(id)}/translate?clientId=${encodeURIComponent(clientId)}`,
      {
        method: 'POST',
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to generate phrase translation');
    }

    const phrase = await res.json();
    this.broadcastUpdate({
      type: 'phrase.translated',
      requestId,
      clientId,
      phraseId: Number(id),
      phrase,
      status: 'completed',
      timestamp: Date.now(),
    });

    return { accepted: true, requestId };
  }
}
