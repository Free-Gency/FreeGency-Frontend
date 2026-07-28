import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ApiResponse } from '../../../../shared/models/ApiResponse';
import { SKIP_LOADING } from '../../../../core/http/loading.interceptor';
import {
  AssistantChatResponse,
  AssistantHistoryItem,
  AssistantIntent,
} from './proposal-assistant.types';

export interface ProposalAssistantRequest {
  message: string;
  command?: string | null;
  history?: AssistantHistoryItem[];
  focusedApplicantName?: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProposalAssistantService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/projects`;

  ask(projectId: string, body: ProposalAssistantRequest): Observable<AssistantChatResponse> {
    return this.http
      .post<ApiResponse<AssistantChatResponse>>(
        `${this.baseUrl}/${projectId}/proposal-assistant`,
        body,
        { context: new HttpContext().set(SKIP_LOADING, true) },
      )
      .pipe(
        map((res) => {
          if (!res.isSuccess || !res.data) {
            throw new Error('Assistant failed to respond.');
          }
          return {
            reply: unwrapReply(res.data.reply ?? ''),
            intent: (res.data.intent ?? 'ask') as AssistantIntent,
            cards: res.data.cards ?? [],
            chips: res.data.chips ?? [],
            actions: res.data.actions ?? [],
          };
        }),
      );
  }
}

/** If the API ever returns a JSON blob as reply, pull out the real text. */
function unwrapReply(raw: string): string {
  const text = raw.trim();
  if (!text.startsWith('{') || !text.includes('"reply"')) return raw;

  try {
    const repaired = repairJsonNewlines(text);
    const parsed = JSON.parse(repaired) as { reply?: string };
    if (parsed.reply) return parsed.reply;
  } catch {
    const match = /"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s.exec(text);
    if (match?.[1]) {
      return match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }
  return 'I had trouble formatting that answer. Please try again.';
}

function repairJsonNewlines(json: string): string {
  let out = '';
  let inString = false;
  let escape = false;
  for (const ch of json) {
    if (inString) {
      if (escape) {
        out += ch;
        escape = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escape = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      if (ch === '\n') {
        out += '\\n';
        continue;
      }
      if (ch === '\r') {
        out += '\\r';
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}
