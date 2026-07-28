export type AssistantIntent =
  | 'summarize'
  | 'compare'
  | 'bestfit'
  | 'rank'
  | 'redflags'
  | 'profile'
  | 'draft'
  | 'questions'
  | 'help'
  | 'why'
  | 'clear'
  | 'ask'
  | 'clarify'
  | 'greeting';

export type AssistantCommandId =
  | 'summarize'
  | 'compare'
  | 'bestfit'
  | 'rank'
  | 'redflags'
  | 'profile'
  | 'draft'
  | 'questions'
  | 'help'
  | 'why'
  | 'clear';

export type AssistantCommandCategory = 'analyze' | 'decide' | 'act' | 'meta';

export interface AssistantCommand {
  id: AssistantCommandId;
  slash: string;
  label: string;
  description: string;
  chipLabel: string;
  category: AssistantCommandCategory;
  /** Alternate spellings users may type after / */
  aliases?: string[];
  /** Needs an applicant name argument */
  needsArg?: boolean;
  usage?: string;
}

export interface AssistantProfileCard {
  type: 'profile';
  applicantName: string;
  proposalId?: string | null;
  userId?: string | null;
  teamId?: string | null;
  avatarUrl?: string | null;
  applicantType?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  skills?: string[];
  highlights?: string[];
  proposedBudget?: number | null;
  coverSnippet?: string | null;
  /** 0–100 smart match when available */
  matchScore?: number | null;
  insight?: string | null;
  topChoice?: boolean;
  /** For summarize / redflags rows */
  strength?: string | null;
  risk?: string | null;
  flags?: string[];
  overBudget?: boolean;
  budgetDelta?: number | null;
}

export interface AssistantAction {
  type: 'view_profile' | 'message' | 'open_milestones' | 'copy_draft';
  userId?: string | null;
  teamId?: string | null;
  proposalId?: string | null;
  projectId?: string | null;
  label?: string | null;
  payload?: string | null;
}

export interface AssistantChatResponse {
  reply: string;
  intent: AssistantIntent;
  cards: AssistantProfileCard[];
  chips: string[];
  actions: AssistantAction[];
}

export interface AssistantHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  intent?: AssistantIntent;
  cards?: AssistantProfileCard[];
  chips?: string[];
  actions?: AssistantAction[];
  proactive?: boolean;
  error?: boolean;
  /** Structured draft body for /draft */
  draftBody?: string | null;
  /** Title line above structured results */
  resultTitle?: string | null;
}

/**
 * Command registry inspired by Slack/Discord slash UX + Uma-style hiring actions:
 * Analyze → Decide → Act, with aliases and arg hints.
 */
export const ASSISTANT_COMMANDS: AssistantCommand[] = [
  {
    id: 'summarize',
    slash: '/summarize',
    label: 'Summarize',
    description: 'Essentials for every proposal',
    chipLabel: 'Summarize',
    category: 'analyze',
    aliases: ['summary', 'essentials', 'overview'],
    usage: '/summarize',
  },
  {
    id: 'compare',
    slash: '/compare',
    label: 'Compare',
    description: 'Head-to-head of two applicants',
    chipLabel: 'Compare bids',
    category: 'analyze',
    aliases: ['vs', 'versus'],
    usage: '/compare Name1 vs Name2',
  },
  {
    id: 'rank',
    slash: '/rank',
    label: 'Rank',
    description: 'Ordered shortlist best → worst',
    chipLabel: 'Rank shortlist',
    category: 'analyze',
    aliases: ['shortlist', 'top', 'order'],
    usage: '/rank',
  },
  {
    id: 'redflags',
    slash: '/redflags',
    label: 'Red flags',
    description: 'Budget, letter, and skill risks',
    chipLabel: 'Red flags',
    category: 'analyze',
    aliases: ['flags', 'risks', 'risk'],
    usage: '/redflags',
  },
  {
    id: 'bestfit',
    slash: '/bestfit',
    label: 'Best match',
    description: 'Recommend the strongest proposal',
    chipLabel: 'Best match',
    category: 'decide',
    aliases: ['best', 'pick', 'winner', 'recommend'],
    usage: '/bestfit',
  },
  {
    id: 'why',
    slash: '/why',
    label: 'Why?',
    description: 'Explain the recommendation',
    chipLabel: 'Why?',
    category: 'decide',
    aliases: ['reason', 'explain'],
    usage: '/why',
  },
  {
    id: 'profile',
    slash: '/profile',
    label: 'Profile',
    description: 'Deep dive on one applicant',
    chipLabel: 'Profile',
    category: 'decide',
    aliases: ['who', 'applicant'],
    needsArg: true,
    usage: '/profile Name',
  },
  {
    id: 'questions',
    slash: '/questions',
    label: 'Screening Qs',
    description: 'Interview questions for an applicant',
    chipLabel: 'Screening Qs',
    category: 'act',
    aliases: ['screen', 'interview', 'askthem'],
    needsArg: true,
    usage: '/questions Name',
  },
  {
    id: 'draft',
    slash: '/draft',
    label: 'Draft message',
    description: 'Draft a message to an applicant',
    chipLabel: 'Draft message',
    category: 'act',
    aliases: ['msg', 'message', 'write'],
    needsArg: true,
    usage: '/draft Name',
  },
  {
    id: 'help',
    slash: '/help',
    label: 'Help',
    description: 'List available commands',
    chipLabel: 'Help',
    category: 'meta',
    aliases: ['cmds', 'commands'],
    usage: '/help',
  },
  {
    id: 'clear',
    slash: '/clear',
    label: 'Clear',
    description: 'Clear this chat',
    chipLabel: 'Clear chat',
    category: 'meta',
    aliases: ['reset'],
    usage: '/clear',
  },
];

export const COMMAND_ALIASES: Record<string, AssistantCommandId> = Object.fromEntries(
  ASSISTANT_COMMANDS.flatMap((c) => [
    [c.id, c.id],
    ...(c.aliases ?? []).map((a) => [a, c.id] as const),
  ]),
) as Record<string, AssistantCommandId>;

export const QUICK_REPLY_CHIPS = [
  'Summarize',
  'Best match',
  'Rank shortlist',
  'Red flags',
] as const;

export function resolveCommandId(token: string): AssistantCommandId | undefined {
  const key = token.trim().toLowerCase().replace(/^\//, '');
  return COMMAND_ALIASES[key];
}
