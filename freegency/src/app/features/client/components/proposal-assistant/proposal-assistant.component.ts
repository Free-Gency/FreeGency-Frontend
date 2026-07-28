import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Proposal } from '../../../../shared/models/Proposal';
import { Project } from '../../../../shared/models/Project';
import { ProposalAssistantService } from './proposal-assistant.service';
import {
  ASSISTANT_COMMANDS,
  AssistantCommand,
  AssistantCommandId,
  AssistantHistoryItem,
  AssistantProfileCard,
  ChatMessage,
  QUICK_REPLY_CHIPS,
  resolveCommandId,
} from './proposal-assistant.types';

@Component({
  selector: 'app-proposal-assistant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proposal-assistant.component.html',
  styleUrl: './proposal-assistant.component.css',
})
export class ProposalAssistantComponent {
  private readonly assistantApi = inject(ProposalAssistantService);

  readonly project = input.required<Project>();
  readonly proposals = input<Proposal[]>([]);
  readonly proposalCount = input(0);
  readonly acceptTip = input(false);

  readonly dismissAcceptTip = output<void>();
  readonly viewProfile = output<{ userId?: string | null; teamId?: string | null }>();
  readonly messageApplicant = output<{
    proposalId?: string | null;
    chatRoomId?: string | null;
    name: string;
  }>();

  @ViewChild('composerInput') composerInput?: ElementRef<HTMLInputElement>;
  @ViewChild('messagesEnd') messagesEnd?: ElementRef<HTMLDivElement>;

  readonly open = signal(false);
  readonly draft = signal('');
  readonly sending = signal(false);
  readonly showPalette = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly hintVisible = signal(true);
  readonly firstComposerFocus = signal(true);

  private sessionProjectId: string | null = null;
  private proactiveDoneFor = new Set<string>();
  private acceptTipShownFor = new Set<string>();
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  private lastBestFitName: string | null = null;

  readonly commands = ASSISTANT_COMMANDS;
  readonly helpGroups = [
    {
      title: 'Analyze',
      commands: ASSISTANT_COMMANDS.filter((c) => c.category === 'analyze'),
    },
    {
      title: 'Decide',
      commands: ASSISTANT_COMMANDS.filter((c) => c.category === 'decide'),
    },
    {
      title: 'Act',
      commands: ASSISTANT_COMMANDS.filter((c) => c.category === 'act'),
    },
  ];
  readonly filteredCommands = computed(() => {
    const value = this.draft().trim();
    if (!value.startsWith('/')) return [];
    const q = value.slice(1).toLowerCase();
    return this.commands.filter((c) => {
      const hay = [c.id, c.label, c.slash, ...(c.aliases ?? [])].join(' ').toLowerCase();
      return hay.includes(q) || c.id.startsWith(q) || (c.aliases ?? []).some((a) => a.startsWith(q));
    });
  });

  readonly contextLabel = computed(() => `${this.project().title} · Proposals`);
  readonly hintCount = computed(() => this.proposalCount() || this.proposals().length || 0);

  constructor() {
    effect(() => {
      const project = this.project();
      if (project?.id && project.id !== this.sessionProjectId) {
        this.resetSession(project.id);
      }
    });

    effect(() => {
      if (this.open()) {
        queueMicrotask(() => this.scrollToBottom());
      }
    });

    effect(() => {
      const list = this.proposals();
      if (this.open() && list.length > 0) {
        this.maybeProactiveRedFlags();
      }
    });

    effect(() => {
      if (this.open() && this.acceptTip()) {
        this.pushAcceptTip();
      }
    });

    effect(() => {
      // Show + auto-dismiss hint when project selected and panel closed
      const id = this.project()?.id;
      const visible = this.hintVisible();
      const isOpen = this.open();
      if (!id || isOpen || !visible) return;
      if (this.hintTimer) clearTimeout(this.hintTimer);
      this.hintTimer = setTimeout(() => this.hintVisible.set(false), 6000);
    });
  }

  composerPlaceholder(): string {
    return this.firstComposerFocus()
      ? "Ask about this project's proposals or type / for commands"
      : 'Message the assistant…';
  }

  isRtl(text: string): boolean {
    return /[\u0600-\u06FF]/.test(text || '');
  }

  toggle(): void {
    if (this.open()) {
      this.open.set(false);
      this.showPalette.set(false);
      return;
    }
    this.openPanel();
  }

  openPanel(): void {
    this.open.set(true);
    this.hintVisible.set(false);
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    if (this.messages().length === 0) {
      this.seedGreeting();
    }
    this.maybeProactiveRedFlags();
    if (this.acceptTip()) {
      this.pushAcceptTip();
    }
    queueMicrotask(() => this.composerInput?.nativeElement.focus());
  }

  close(): void {
    this.open.set(false);
    this.showPalette.set(false);
  }

  onDraftChange(value: string): void {
    this.draft.set(value);
    this.showPalette.set(value.trim().startsWith('/'));
    if (value.length > 0) this.firstComposerFocus.set(false);
  }

  onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.showPalette.set(false);
      return;
    }
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.showPalette() && this.filteredCommands().length > 0) {
        this.pickCommand(this.filteredCommands()[0]);
        return;
      }
      this.send();
    }
  }

  pickCommand(cmd: AssistantCommand): void {
    this.showPalette.set(false);
    if (cmd.needsArg) {
      this.draft.set(`${cmd.slash} `);
      queueMicrotask(() => this.composerInput?.nativeElement.focus());
      return;
    }
    this.draft.set('');
    void this.runUserText(cmd.slash, cmd.id);
  }

  sendChip(label: string): void {
    const draftMatch = /^draft\s+(.+)$/i.exec(label);
    if (draftMatch) {
      const name = draftMatch[1].trim();
      void this.runUserText(`/draft ${name}`, 'draft', name);
      return;
    }
    const profileMatch = /^profile\s+(.+)$/i.exec(label);
    if (profileMatch) {
      const name = profileMatch[1].trim();
      void this.runUserText(`/profile ${name}`, 'profile', name);
      return;
    }
    const questionsMatch = /^(?:questions|screening qs)\s+(.+)$/i.exec(label);
    if (questionsMatch) {
      const name = questionsMatch[1].trim();
      void this.runUserText(`/questions ${name}`, 'questions', name);
      return;
    }
    if (label === 'Draft message' && this.lastBestFitName) {
      void this.runUserText(`/draft ${this.lastBestFitName}`, 'draft', this.lastBestFitName);
      return;
    }
    if (label === 'Screening Qs' && this.lastBestFitName) {
      void this.runUserText(`/questions ${this.lastBestFitName}`, 'questions', this.lastBestFitName);
      return;
    }
    if (label === 'Why?') {
      void this.runUserText('/why', 'why');
      return;
    }

    const mapped = this.commands.find((c) => c.chipLabel === label || c.slash === label);
    if (mapped) {
      void this.runUserText(mapped.slash, mapped.id);
      return;
    }
    void this.runUserText(label);
  }

  onChipClick(chip: string): void {
    if (this.applicantNames().some((n) => n.toLowerCase() === chip.toLowerCase())) {
      this.onNameChip(chip);
      return;
    }
    this.sendChip(chip);
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) return;
    this.draft.set('');
    this.showPalette.set(false);
    void this.runUserText(text);
  }

  onNameChip(name: string): void {
    void this.runUserText(`/profile ${name}`, 'profile', name);
  }

  onViewProfile(card: AssistantProfileCard): void {
    this.viewProfile.emit({ userId: card.userId, teamId: card.teamId });
  }

  onMessage(card: AssistantProfileCard): void {
    const proposal = this.proposals().find((p) => p.id === card.proposalId);
    this.messageApplicant.emit({
      proposalId: card.proposalId,
      chatRoomId: proposal?.chatRoomId ?? null,
      name: card.applicantName,
    });
  }

  dismissTip(): void {
    this.dismissAcceptTip.emit();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .map((p) => p.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  isTopChoice(card: AssistantProfileCard, index: number, total = 1): boolean {
    if (card.topChoice) return true;
    if (total < 2) return false;
    return index === 0;
  }

  matchPercent(card: AssistantProfileCard): number | null {
    if (card.matchScore != null && !Number.isNaN(card.matchScore)) {
      const n = card.matchScore <= 1 ? card.matchScore * 100 : card.matchScore;
      return Math.round(Math.min(100, Math.max(0, n)));
    }
    if (card.rating != null) {
      return Math.round(Math.min(99, Math.max(55, (card.rating / 5) * 100)));
    }
    return null;
  }

  cardInsight(card: AssistantProfileCard): string | null {
    if (card.insight?.trim()) return card.insight.trim();
    if (card.highlights?.length) return card.highlights[0];
    if (card.coverSnippet?.trim()) {
      const s = card.coverSnippet.trim();
      return s.length > 110 ? s.slice(0, 110) + '…' : s;
    }
    return null;
  }

  private resetSession(projectId: string): void {
    this.sessionProjectId = projectId;
    this.messages.set([]);
    this.draft.set('');
    this.showPalette.set(false);
    this.open.set(false);
    this.hintVisible.set(true);
    this.firstComposerFocus.set(true);
  }

  private clearChat(): void {
    this.messages.set([]);
    this.draft.set('');
    this.showPalette.set(false);
    this.sending.set(false);
    // Allow proactive tips again for this project after a fresh start
    this.proactiveDoneFor.delete(this.project().id);
    this.seedGreeting();
    this.maybeProactiveRedFlags();
    queueMicrotask(() => this.composerInput?.nativeElement.focus());
  }

  private seedGreeting(): void {
    const n = this.hintCount();

    this.pushAssistant({
      content:
        n > 0
          ? `I can help you review these ${n} proposal${n === 1 ? '' : 's'} — bid, fit, and risks.`
          : `I can help once proposals arrive. Press / for commands.`,
      intent: 'greeting',
      chips: [...QUICK_REPLY_CHIPS],
    });
  }

  private maybeProactiveRedFlags(): void {
    const project = this.project();
    if (this.proactiveDoneFor.has(project.id)) return;

    const list = this.proposals();
    if (list.length === 0) return;

    const overBudget = list.filter((p) => p.proposedBudget > project.budgetMax);
    const weakLetters = list.filter((p) => (p.coverLetter?.trim().length ?? 0) < 80);

    if (overBudget.length === 0 && weakLetters.length === 0) {
      this.proactiveDoneFor.add(project.id);
      return;
    }

    this.proactiveDoneFor.add(project.id);

    const lines: string[] = [];
    if (overBudget.length) {
      lines.push(
        `${overBudget.length} proposal${overBudget.length === 1 ? ' is' : 's are'} above your max budget (${project.budgetMax} ${project.currency}).`,
      );
    }
    if (weakLetters.length) {
      lines.push(
        `${weakLetters.length} cover letter${weakLetters.length === 1 ? ' looks' : 's look'} thin.`,
      );
    }

    this.pushAssistant({
      content: lines.join(' '),
      intent: 'redflags',
      chips: [],
      proactive: true,
    });
  }

  private pushAcceptTip(): void {
    const projectId = this.project().id;
    if (this.acceptTipShownFor.has(projectId)) return;
    this.acceptTipShownFor.add(projectId);

    this.pushAssistant({
      content:
        'Proposal accepted. Next, you can sketch an initial milestone plan from the project page so kickoff is clearer for both sides.',
      intent: 'ask',
      actions: [
        {
          type: 'open_milestones',
          projectId,
          label: 'Open project milestones',
        },
      ],
      chips: [],
    });
  }

  private async runUserText(
    text: string,
    forcedCommand?: AssistantCommandId,
    focusedName?: string,
  ): Promise<void> {
    const parsed = this.parseSlash(text);
    const command = forcedCommand ?? parsed.command;

    if (command === 'clear' || text.trim().toLowerCase() === '/clear') {
      this.clearChat();
      return;
    }

    this.pushUser(text);

    const focus = focusedName ?? parsed.arg ?? this.detectMentionedName(text);

    if (command === 'help') {
      this.pushAssistant(this.buildHelpReply());
      return;
    }

    if ((command === 'profile' || command === 'draft' || command === 'questions') && !focus) {
      const prompt =
        command === 'draft'
          ? 'Who should I draft a message for?'
          : command === 'questions'
            ? 'Who should I write screening questions for?'
            : 'Which applicant’s profile should I open?';
      this.pushAssistant(this.buildWhoReply(prompt));
      return;
    }

    // Empty inbox — no point calling the model
    if (
      command &&
      ['summarize', 'compare', 'bestfit', 'rank', 'redflags', 'why'].includes(command) &&
      this.proposals().length === 0
    ) {
      this.pushAssistant({
        content: 'No proposals loaded for this project yet.',
        intent: command,
        resultTitle: this.titleForIntent(command),
      });
      return;
    }

    // All analysis / decide / act commands go through the AI.
    // Local builders are fallback only when the model returns empty structure.
    this.sending.set(true);
    const history = this.buildHistory();
    const compareFocus = command === 'compare' ? this.parseCompareFocus(focus ?? parsed.arg) : null;

    this.assistantApi
      .ask(this.project().id, {
        message: text,
        command: command ?? null,
        focusedApplicantName: compareFocus ?? focus ?? null,
        history,
      })
      .subscribe({
        next: (res) => {
          this.sending.set(false);
          const normalized = this.normalizeApiResponse(res);
          const intent = (normalized.intent || command || 'ask') as ChatMessage['intent'];

          let cards =
            normalized.cards.length > 0
              ? normalized.cards.map((c, i) => this.mergeAiCard(c, intent, i))
              : [];

          // Summarize should list everyone as bullet cards — fill gaps from local scoring
          if (intent === 'summarize' && this.proposals().length > 0) {
            const localCards = this.scoredProposals();
            if (cards.length < localCards.length) {
              cards = localCards.map((local, i) => {
                const ai = cards.find(
                  (c) => c.applicantName.toLowerCase() === local.applicantName.toLowerCase(),
                );
                return ai ? this.mergeAiCard({ ...local, ...ai }, intent, i) : local;
              });
            }
          }

          const cleanReply = this.sanitizeReply(normalized.reply, intent, cards);

          if (
            cards.length === 0 &&
            command &&
            ['summarize', 'compare', 'bestfit', 'rank', 'redflags', 'why', 'profile'].includes(command)
          ) {
            const local = this.localResultForIntent(command, focus);
            if (local) {
              const intro =
                intent === 'summarize' || intent === 'rank'
                  ? this.shortStructuredIntro(intent, local.cards?.length ? local.cards : cards, cleanReply)
                  : cleanReply || local.content;
              this.pushAssistant({
                ...local,
                content: intro,
              });
              return;
            }
          }

          if ((intent === 'bestfit' || intent === 'rank') && cards[0]) {
            this.lastBestFitName = cards[0].applicantName;
            cards = cards.map((c, i) => ({ ...c, topChoice: i === 0 }));
          }

          if (intent === 'draft') {
            this.pushAssistant({
              content: 'Here’s a draft you can copy and send:',
              intent: 'draft',
              draftBody: cleanReply || normalized.reply,
              cards: [],
              chips: focus
                ? [`Profile ${focus}`, `Questions ${focus}`]
                : this.lastBestFitName
                  ? [`Questions ${this.lastBestFitName}`]
                  : [],
              resultTitle: focus ? `Draft for ${focus}` : 'Draft message',
              actions: [
                {
                  type: 'copy_draft',
                  label: 'Copy draft',
                  payload: cleanReply || normalized.reply,
                },
              ],
            });
            return;
          }

          if (intent === 'questions') {
            this.pushAssistant({
              content: cleanReply || normalized.reply,
              intent: 'questions',
              cards,
              chips: focus
                ? [`Draft ${focus}`, `Profile ${focus}`]
                : ['Best match'],
              resultTitle: focus ? `Screening · ${focus}` : 'Screening questions',
            });
            return;
          }

          const followUps = this.followUpChips(intent, cards[0]?.applicantName ?? focus);
          const displayContent =
            (intent === 'summarize' || intent === 'rank') && cards.length
              ? this.shortStructuredIntro(intent, cards, cleanReply)
              : cleanReply;
          this.pushAssistant({
            content: displayContent,
            intent,
            cards,
            chips: this.chipsForIntent(intent ?? 'ask', normalized.chips.length ? normalized.chips : followUps),
            actions: normalized.actions ?? [],
            resultTitle: this.titleForIntent(intent ?? 'ask'),
          });
        },
        error: () => {
          this.sending.set(false);
          // Offline / API failure → local structured fallback when possible
          if (command) {
            const local = this.localResultForIntent(command, focus);
            if (local) {
              this.pushAssistant({
                ...local,
                content: `${local.content}\n\n(Showing offline analysis — AI unreachable.)`,
              });
              return;
            }
          }
          this.pushAssistant({
            content: 'I couldn’t reach the assistant right now. Try again in a moment.',
            intent: 'ask',
            chips: ['Summarize', 'Best match'],
            error: true,
          });
        },
      });
  }

  private localResultForIntent(
    intent: AssistantCommandId,
    focus?: string,
  ): Omit<ChatMessage, 'id' | 'role'> | null {
    switch (intent) {
      case 'summarize':
        return this.buildSummarizeResult();
      case 'compare':
        return this.buildCompareResult(focus);
      case 'bestfit':
        return this.buildBestfitResult();
      case 'rank':
        return this.buildRankResult();
      case 'redflags':
        return this.buildRedflagsResult();
      case 'why':
        return this.buildWhyResult();
      case 'profile':
        return focus ? this.buildProfileResult(focus) : null;
      case 'draft':
        return focus ? this.buildDraftResult(focus) : null;
      case 'questions':
        return focus ? this.buildQuestionsResult(focus) : null;
      default:
        return null;
    }
  }

  private titleForIntent(intent: string): string | null {
    switch (intent) {
      case 'summarize':
        return 'Proposal essentials';
      case 'compare':
        return 'Head-to-head';
      case 'bestfit':
        return 'Best match';
      case 'rank':
        return 'Ranked shortlist';
      case 'redflags':
        return 'Risk scan';
      case 'profile':
        return 'Applicant profile';
      case 'draft':
        return 'Draft message';
      case 'questions':
        return 'Screening questions';
      case 'why':
        return 'Why this pick';
      case 'help':
        return 'Commands';
      default:
        return null;
    }
  }

  private followUpChips(intent: string | undefined, name?: string | null): string[] {
    switch (intent) {
      case 'summarize':
        return ['Best match', 'Rank shortlist', 'Red flags'];
      case 'compare':
        return ['Best match', 'Why?', 'Red flags'];
      case 'bestfit':
        return ['Why?', 'Draft message', 'Screening Qs'];
      case 'rank':
        return ['Best match', 'Compare bids', 'Red flags'];
      case 'redflags':
        return ['Best match', 'Compare bids'];
      case 'why':
        return ['Draft message', 'Screening Qs', 'Compare bids'];
      case 'profile':
        return name ? [`Draft ${name}`, `Questions ${name}`] : ['Best match'];
      case 'questions':
        return name ? [`Draft ${name}`] : ['Best match'];
      default:
        return [];
    }
  }

  private scoredProposals(): AssistantProfileCard[] {
    const project = this.project();
    const mid = (project.budgetMin + project.budgetMax) / 2 || project.budgetMax || 1;
    const required = (project.skills ?? []).map((s) => s.toLowerCase());
    return this.proposals().map((p) => {
      const card = this.cardFromProposal(p);
      const over = p.proposedBudget > project.budgetMax;
      const underMin = p.proposedBudget < project.budgetMin;
      const letterLen = p.coverLetter?.trim().length ?? 0;
      const applicantSkills = (card.skills ?? []).map((s) => s.toLowerCase());
      const overlap =
        required.length === 0
          ? 0.5
          : required.filter((r) => applicantSkills.some((a) => a === r || a.includes(r) || r.includes(a)))
              .length / required.length;
      const budgetScore = over
        ? Math.max(20, 70 - ((p.proposedBudget - project.budgetMax) / mid) * 40)
        : underMin
          ? 75
          : 90 - (Math.abs(p.proposedBudget - mid) / mid) * 25;
      const letterScore = letterLen < 80 ? 45 : letterLen < 200 ? 70 : 88;
      const skillScore = Math.round(overlap * 100);
      const match = Math.round(
        Math.min(99, Math.max(42, skillScore * 0.4 + budgetScore * 0.35 + letterScore * 0.25)),
      );
      const strength =
        skillScore >= 60
          ? `Strong skill overlap (~${skillScore}%)`
          : letterLen >= 200
            ? 'Detailed, project-aware cover letter'
            : !over
              ? 'Bid within your budget range'
              : 'Competitive positioning';
      const risk = over
        ? `Bid $${Math.round(p.proposedBudget - project.budgetMax)} over max`
        : letterLen < 80
          ? 'Thin cover letter'
          : skillScore < 34 && required.length
            ? 'Low overlap with required skills'
            : underMin
              ? 'Bid below your minimum'
              : 'No major red flags';
      return {
        ...card,
        matchScore: match,
        overBudget: over,
        budgetDelta: over ? p.proposedBudget - project.budgetMax : p.proposedBudget - project.budgetMin,
        strength,
        risk,
        insight: strength,
        highlights: [strength, risk],
        flags: [
          ...(over ? [`Over budget by $${Math.round(p.proposedBudget - project.budgetMax)}`] : []),
          ...(letterLen < 80 ? ['Cover letter under 80 characters'] : []),
          ...(skillScore < 34 && required.length ? ['Low skill overlap vs project requirements'] : []),
        ],
      };
    });
  }

  private buildSummarizeResult(): Omit<ChatMessage, 'id' | 'role'> {
    const cards = this.scoredProposals().map((c) => ({
      ...c,
      insight: c.insight || c.strength || null,
    }));
    if (!cards.length) {
      return {
        content: 'No proposals loaded for this project yet.',
        intent: 'summarize',
        resultTitle: 'Proposal essentials',
      };
    }
    const budgets = cards
      .map((c) => c.proposedBudget)
      .filter((b): b is number => b != null);
    const min = budgets.length ? Math.min(...budgets) : null;
    const max = budgets.length ? Math.max(...budgets) : null;
    const range =
      min != null && max != null
        ? min === max
          ? `bids around $${min}`
          : `bids from $${min} to $${max}`
        : 'see bids below';
    return {
      content: `${cards.length} proposal${cards.length === 1 ? '' : 's'} — ${range}.`,
      intent: 'summarize',
      resultTitle: 'Proposal essentials',
      cards,
      chips: ['Compare bids', 'Best match', 'Red flags'],
    };
  }

  private buildCompareResult(focusArg?: string): Omit<ChatMessage, 'id' | 'role'> {
    const ranked = [...this.scoredProposals()].sort(
      (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0),
    );
    const named = this.resolveComparePair(focusArg, ranked);
    const pairSource = named ?? ranked.slice(0, 2);

    if (pairSource.length < 2) {
      return {
        content:
          pairSource.length === 1
            ? 'Only one proposal is available — open Best match to review it.'
            : 'Need at least two proposals to compare.',
        intent: 'compare',
        resultTitle: 'Head-to-head',
        cards: pairSource,
        chips: pairSource.length === 1 ? ['Best match'] : [],
      };
    }
    const pair = pairSource.slice(0, 2).map((c, i) => ({
      ...c,
      topChoice: i === 0,
      insight:
        i === 0
          ? `Leads on fit (${c.matchScore}% match) — ${c.strength}`
          : `Runner-up — watch: ${c.risk}`,
    }));
    this.lastBestFitName = pair[0].applicantName;
    return {
      content: `${pair[0].applicantName} vs ${pair[1].applicantName} — closest contenders by budget fit and proposal depth.`,
      intent: 'compare',
      resultTitle: 'Head-to-head',
      cards: pair,
      chips: ['Best match', 'Why?', 'Red flags'],
    };
  }

  private resolveComparePair(
    focusArg: string | undefined,
    ranked: AssistantProfileCard[],
  ): AssistantProfileCard[] | null {
    if (!focusArg?.trim()) return null;
    const parts = focusArg
      .split(/\s+vs\s+|\s+versus\s+|,/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length < 2) return null;
    const a = ranked.find((c) => c.applicantName.toLowerCase().includes(parts[0].toLowerCase()));
    const b = ranked.find((c) => c.applicantName.toLowerCase().includes(parts[1].toLowerCase()));
    if (!a || !b || a.applicantName === b.applicantName) return null;
    return [a, b];
  }

  private buildRankResult(): Omit<ChatMessage, 'id' | 'role'> {
    const ranked = [...this.scoredProposals()]
      .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
      .slice(0, 5)
      .map((c, i) => ({
        ...c,
        topChoice: i === 0,
        insight: `#${i + 1} — ${c.strength}. Watch: ${c.risk}`,
        strength: `#${i + 1} · ${c.strength}`,
      }));
    if (!ranked.length) {
      return {
        content: 'No proposals to rank yet.',
        intent: 'rank',
        resultTitle: 'Ranked shortlist',
      };
    }
    this.lastBestFitName = ranked[0].applicantName;
    return {
      content: `Shortlist by fit score: ${ranked.map((c) => c.applicantName).join(' → ')}.`,
      intent: 'rank',
      resultTitle: 'Ranked shortlist',
      cards: ranked,
      chips: ['Best match', 'Compare bids', 'Red flags'],
    };
  }

  private buildQuestionsResult(name: string): Omit<ChatMessage, 'id' | 'role'> {
    const card =
      this.scoredProposals().find((c) => c.applicantName.toLowerCase() === name.toLowerCase()) ??
      this.buildLocalProfileCard(name);
    const project = this.project();
    const who = card?.applicantName ?? name;
    const skills = this.project().skills ?? [];
    const skillHint = skills.length ? skills.slice(0, 3).join(', ') : 'the core stack';
    const qs = [
      `1. How would you approach “${project.title}” in the first two weeks?`,
      `2. Which parts of ${skillHint} would you own yourself vs hand off?`,
      card?.overBudget
        ? `3. Your bid is above our max — what scope trade-offs would keep quality without blowing the budget?`
        : `3. How would you break the work into milestones against your $${card?.proposedBudget ?? 'proposed'} bid?`,
      `4. What’s the biggest risk you see in this brief, and how would you mitigate it?`,
      `5. Can you share a similar project (link or outline) and what you’d do differently here?`,
    ].join('\n');
    return {
      content: qs,
      intent: 'questions',
      resultTitle: `Screening · ${who}`,
      cards: card ? [{ ...card, insight: 'Use these on a short call to validate fit.' }] : [],
      chips: [`Draft ${who}`, `Profile ${who}`],
    };
  }

  private buildBestfitResult(): Omit<ChatMessage, 'id' | 'role'> {
    const ranked = [...this.scoredProposals()].sort(
      (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0),
    );
    if (!ranked.length) {
      return {
        content: 'No proposals to rank yet.',
        intent: 'bestfit',
        resultTitle: 'Best match',
      };
    }
    const winner = { ...ranked[0], topChoice: true };
    this.lastBestFitName = winner.applicantName;
    return {
      content: `I’d go with ${winner.applicantName} (${winner.matchScore}% match). ${winner.strength}. Main caveat: ${winner.risk}.`,
      intent: 'bestfit',
      resultTitle: 'Best match',
      cards: [winner],
      chips: ['Why?', 'Draft message', 'Compare bids'],
    };
  }

  private buildRedflagsResult(): Omit<ChatMessage, 'id' | 'role'> {
    const flagged = this.scoredProposals().filter((c) => (c.flags?.length ?? 0) > 0);
    if (!flagged.length) {
      return {
        content: 'No major red flags on the current page — bids look in range and cover letters aren’t empty.',
        intent: 'redflags',
        resultTitle: 'Risk scan',
        chips: ['Best match', 'Compare bids'],
      };
    }
    return {
      content: `Found ${flagged.length} proposal${flagged.length === 1 ? '' : 's'} with risk signals.`,
      intent: 'redflags',
      resultTitle: 'Risk scan',
      cards: flagged.map((c) => ({
        ...c,
        insight: c.flags!.join(' · '),
      })),
      chips: ['Compare bids', 'Best match'],
    };
  }

  private buildProfileResult(name: string): Omit<ChatMessage, 'id' | 'role'> {
    const card = this.scoredProposals().find(
      (c) => c.applicantName.toLowerCase() === name.toLowerCase(),
    ) ?? this.buildLocalProfileCard(name);
    if (!card) {
      return {
        content: `I couldn’t find “${name}” in the current proposals.`,
        intent: 'profile',
        resultTitle: 'Applicant profile',
        chips: this.applicantNames().slice(0, 3),
      };
    }
    return {
      content: `${card.applicantName} — ${card.applicantType === 'Team' ? 'Team' : 'Individual'} bid.`,
      intent: 'profile',
      resultTitle: 'Applicant profile',
      cards: [{ ...card, topChoice: false }],
      chips: [`Draft ${card.applicantName}`, 'Compare bids'],
    };
  }

  private buildDraftResult(name: string): Omit<ChatMessage, 'id' | 'role'> {
    const card =
      this.scoredProposals().find((c) => c.applicantName.toLowerCase() === name.toLowerCase()) ??
      this.buildLocalProfileCard(name);
    const project = this.project();
    const who = card?.applicantName ?? name;
    const draft = [
      `Hi ${who.split(' ')[0]},`,
      '',
      `Thanks for applying to “${project.title}”. Your proposal stood out and I’d like to discuss scope and timeline before we move forward.`,
      '',
      card?.proposedBudget != null
        ? `You proposed $${card.proposedBudget} — happy to align on milestones against that number.`
        : `Could you share how you’d break the work into milestones?`,
      '',
      'Are you available for a short call this week?',
      '',
      'Best,',
      'Client',
    ].join('\n');

    return {
      content: 'Copy this draft, tweak the tone, then send from the proposal card.',
      intent: 'draft',
      resultTitle: `Draft for ${who}`,
      draftBody: draft,
      cards: [],
      chips: card ? [`Profile ${who}`, 'Best match'] : ['Best match'],
      actions: [{ type: 'copy_draft', label: 'Copy draft', payload: draft }],
    };
  }

  private buildWhyResult(): Omit<ChatMessage, 'id' | 'role'> {
    const name = this.lastBestFitName;
    const ranked = [...this.scoredProposals()].sort(
      (a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0),
    );
    const winner =
      (name && ranked.find((c) => c.applicantName === name)) || ranked[0] || null;
    if (!winner) {
      return {
        content: 'Run /bestfit first so I have a recommendation to explain.',
        intent: 'why',
        resultTitle: 'Why this pick',
        chips: ['Best match'],
      };
    }
    this.lastBestFitName = winner.applicantName;
    const lines = [
      `Why ${winner.applicantName}:`,
      `• Fit score ~${winner.matchScore}% vs your budget and proposal depth`,
      `• Strength: ${winner.strength}`,
      `• Watch-out: ${winner.risk}`,
    ];
    return {
      content: lines.join('\n'),
      intent: 'why',
      resultTitle: 'Why this pick',
      cards: [{ ...winner, topChoice: true }],
      chips: ['Draft message', 'Compare bids'],
    };
  }

  /** Safety net: unwrap raw JSON reply blobs the API may still pass through. */
  private normalizeApiResponse(res: {
    reply: string;
    intent: string;
    cards: AssistantProfileCard[];
    chips: string[];
    actions: import('./proposal-assistant.types').AssistantAction[];
  }): {
    reply: string;
    intent: import('./proposal-assistant.types').AssistantIntent;
    cards: AssistantProfileCard[];
    chips: string[];
    actions: import('./proposal-assistant.types').AssistantAction[];
  } {
    let reply = res.reply?.trim() ?? '';
    let intent = res.intent;
    let chips = res.chips ?? [];
    let cards = res.cards ?? [];
    const actions = res.actions ?? [];

    if (reply.startsWith('{') && reply.includes('"reply"')) {
      try {
        const parsed = JSON.parse(this.repairClientJson(reply)) as {
          reply?: string;
          intent?: string;
          chips?: string[];
          cards?: AssistantProfileCard[];
        };
        if (parsed.reply) {
          reply = parsed.reply;
          intent = parsed.intent || intent;
          chips = parsed.chips ?? chips;
          cards = parsed.cards ?? cards;
        }
      } catch {
        const match = /"reply"\s*:\s*"((?:\\.|[^"\\])*)"/s.exec(reply);
        if (match?.[1]) {
          reply = match[1]
            .replace(/\\n/g, '\n')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
        } else {
          reply = 'I had trouble formatting that answer. Please try again.';
        }
      }
    }

    return {
      reply,
      intent: (intent || 'ask') as import('./proposal-assistant.types').AssistantIntent,
      cards,
      chips,
      actions,
    };
  }

  /**
   * Strip markdown tables / GUIDs the model sometimes dumps into reply.
   * For structured intents with cards, rebuild a short sentence if reply is unusable.
   */
  private sanitizeReply(
    reply: string,
    intent?: string | null,
    cards: AssistantProfileCard[] = [],
  ): string {
    let text = (reply ?? '').trim();
    if (!text) return this.fallbackReplyFromCards(intent, cards);

    // Drop markdown table rows
    text = text
      .split(/\r?\n/)
      .filter((line) => {
        const t = line.trim();
        if (!t) return true;
        const pipes = (t.match(/\|/g) || []).length;
        if (pipes >= 2) return false;
        if (/^[\s|:\-]{3,}$/.test(t)) return false;
        if (/^-{3,}$/.test(t)) return false;
        return true;
      })
      .join('\n');

    text = text
      .replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
        '',
      )
      .replace(/\bProposal\s*IDs?\b\s*:?\s*/gi, '')
      .replace(/\bUserId\b\s*:?\s*/gi, '')
      .replace(/\bTeamId\b\s*:?\s*/gi, '')
      .replace(/\*\*/g, '')
      .replace(/\|/g, ' ')
      .replace(/-{3,}/g, ' ')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const structured = ['summarize', 'compare', 'bestfit', 'rank', 'redflags', 'profile'].includes(
      intent ?? '',
    );
    const looksLikeApplicantDump =
      (text.match(/^\s*[-*•]/gm) || []).length >= 2 ||
      (text.match(/\b\$\d+/g) || []).length >= 3;
    const looksBroken =
      !text ||
      text.length < 12 ||
      (text.match(/\|/g) || []).length >= 2 ||
      /proposal\s*id/i.test(text);

    if (structured && cards.length && (looksBroken || looksLikeApplicantDump || text.length > 220)) {
      return this.fallbackReplyFromCards(intent, cards) || text.slice(0, 160);
    }

    if (looksBroken && cards.length) {
      return this.fallbackReplyFromCards(intent, cards);
    }

    return text;
  }

  /** Short intro above structured summarize/rank cards — never a markdown dump. */
  private shortStructuredIntro(
    intent: string | null | undefined,
    cards: AssistantProfileCard[],
    rawReply?: string,
  ): string {
    const cleaned = (rawReply ?? '')
      .replace(/\*\*/g, '')
      .trim();
    const isDump =
      !cleaned ||
      cleaned.length > 180 ||
      (cleaned.match(/^\s*[-*•]/gm) || []).length >= 2 ||
      (cleaned.match(/\b\$\d+/g) || []).length >= 2;

    if (!isDump) return cleaned;
    return this.fallbackReplyFromCards(intent, cards);
  }

  private fallbackReplyFromCards(
    intent?: string | null,
    cards: AssistantProfileCard[] = [],
  ): string {
    if (!cards.length) return '';
    const a = cards[0];
    const b = cards[1];
    switch (intent) {
      case 'compare':
        return b
          ? `${a.applicantName} edges ahead of ${b.applicantName} — see the cards for the trade-offs.`
          : `Comparing ${a.applicantName}.`;
      case 'bestfit':
        return `I’d go with ${a.applicantName}${a.matchScore != null ? ` (${a.matchScore}% match)` : ''}.`;
      case 'rank':
        return `Shortlist: ${cards
          .slice(0, 5)
          .map((c) => c.applicantName)
          .join(' → ')}.`;
      case 'redflags':
        return `Flagged ${cards.length} proposal${cards.length === 1 ? '' : 's'} with risk signals.`;
      case 'summarize':
        return `Quick read across ${cards.length} proposal${cards.length === 1 ? '' : 's'}.`;
      case 'profile':
        return `${a.applicantName} — fit notes below.`;
      default:
        return a.insight?.trim() || '';
    }
  }

  private repairClientJson(json: string): string {
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

  /** Chips only for greeting (essentials) and clarify (names). */
  private chipsForIntent(intent: string, fromApi: string[]): string[] {
    if (intent === 'clarify' && fromApi.length) return fromApi.slice(0, 5);
    if (intent === 'greeting') return [...QUICK_REPLY_CHIPS];
    if (fromApi.length) return fromApi.slice(0, 3);
    return [];
  }

  copyDraft(text: string | null | undefined): void {
    if (!text) return;
    void navigator.clipboard?.writeText(text);
  }

  intentLabel(intent?: string | null): string {
    switch (intent) {
      case 'summarize':
        return 'Summarize';
      case 'compare':
        return 'Compare';
      case 'bestfit':
        return 'Best match';
      case 'rank':
        return 'Rank';
      case 'redflags':
        return 'Red flags';
      case 'profile':
        return 'Profile';
      case 'draft':
        return 'Draft';
      case 'questions':
        return 'Screening';
      case 'why':
        return 'Why';
      case 'help':
        return 'Help';
      default:
        return '';
    }
  }

  private parseSlash(text: string): { command?: AssistantCommandId; arg?: string } {
    const trimmed = text.trim();
    if (!trimmed.startsWith('/')) return {};
    const [head, ...rest] = trimmed.slice(1).split(/\s+/);
    const id = resolveCommandId(head);
    if (!id) return {};
    const arg = rest.join(' ').trim();
    return { command: id, arg: arg || undefined };
  }

  /** Prefer "A vs B" focus string for compare when two names are present. */
  private parseCompareFocus(arg?: string | null): string | null {
    if (!arg?.trim()) return null;
    const cleaned = arg.replace(/\s+versus\s+/i, ' vs ').trim();
    return cleaned || null;
  }

  private detectMentionedName(text: string): string | undefined {
    const lower = text.toLowerCase();
    for (const name of this.applicantNames()) {
      if (lower.includes(name.toLowerCase())) return name;
    }
    return undefined;
  }

  private applicantNames(): string[] {
    return this.proposals()
      .map((p) => this.displayName(p))
      .filter((n) => n && n !== 'Unknown applicant' && n !== 'Unknown team');
  }

  private displayName(p: Proposal): string {
    return p.applicantType === 'Team'
      ? p.teamName ?? 'Unknown team'
      : p.applicantName ?? 'Unknown applicant';
  }

  private buildLocalProfileCard(name: string): AssistantProfileCard | null {
    const exact = this.proposals().find(
      (p) => this.displayName(p).toLowerCase() === name.toLowerCase(),
    );
    if (exact) return this.cardFromProposal(exact);

    const fuzzy = this.proposals().find((p) =>
      this.displayName(p).toLowerCase().includes(name.toLowerCase()),
    );
    return fuzzy ? this.cardFromProposal(fuzzy) : null;
  }

  private cardFromProposal(proposal: Proposal): AssistantProfileCard {
    return {
      type: 'profile',
      applicantName: this.displayName(proposal),
      proposalId: proposal.id,
      userId: proposal.userId,
      teamId: proposal.teamId,
      avatarUrl: proposal.applicantAvatarUrl,
      applicantType: proposal.applicantType,
      proposedBudget: proposal.proposedBudget,
      coverSnippet: proposal.coverLetter?.slice(0, 160) ?? null,
      insight: proposal.coverLetter?.trim()
        ? proposal.coverLetter.trim().slice(0, 110) + (proposal.coverLetter.length > 110 ? '…' : '')
        : null,
      highlights: [],
      skills: [],
    };
  }

  private enrichCard(card: AssistantProfileCard): AssistantProfileCard {
    const local = card.applicantName ? this.buildLocalProfileCard(card.applicantName) : null;
    if (!local) return card;
    return {
      ...local,
      ...card,
      avatarUrl: card.avatarUrl ?? local.avatarUrl,
      proposalId: card.proposalId ?? local.proposalId,
      userId: card.userId ?? local.userId,
      teamId: card.teamId ?? local.teamId,
      proposedBudget: card.proposedBudget ?? local.proposedBudget,
      coverSnippet: card.coverSnippet ?? local.coverSnippet,
      skills: card.skills?.length ? card.skills : local.skills,
      highlights: card.highlights?.length ? card.highlights : local.highlights,
      insight: card.insight?.trim() ? card.insight : local.insight,
    };
  }

  private buildHelpReply(): Omit<ChatMessage, 'id' | 'role'> {
    return {
      content: 'Commands are grouped by job — Analyze, Decide, then Act.',
      intent: 'help',
      resultTitle: 'Commands',
      chips: [...QUICK_REPLY_CHIPS],
    };
  }

  /** Merge model card with local signals; keep AI insight/highlights when present. */
  private mergeAiCard(
    card: AssistantProfileCard,
    intent: string | undefined,
    index: number,
  ): AssistantProfileCard {
    const scored = card.applicantName
      ? this.scoredProposals().find(
          (c) => c.applicantName.toLowerCase() === card.applicantName.toLowerCase(),
        )
      : null;
    const base = this.enrichCard(card);
    const local = scored ?? this.buildLocalProfileCard(card.applicantName);
    const highlights =
      card.highlights?.filter(Boolean).length
        ? card.highlights
        : local?.highlights ?? base.highlights;
    const insightRaw =
      card.insight?.trim() ||
      highlights?.[0] ||
      local?.insight ||
      base.insight;
    const insight = insightRaw
      ? insightRaw
          .replace(
            /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
            '',
          )
          .replace(/\|/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
      : insightRaw;

    return {
      ...local,
      ...base,
      insight,
      highlights,
      strength: highlights?.[0] ?? local?.strength ?? base.strength,
      risk: highlights?.[1] ?? local?.risk ?? base.risk,
      flags:
        intent === 'redflags'
          ? (highlights?.length ? highlights : local?.flags) ?? []
          : local?.flags ?? base.flags,
      matchScore: base.matchScore ?? local?.matchScore,
      topChoice: intent === 'bestfit' || intent === 'rank' ? index === 0 : !!card.topChoice,
      overBudget: local?.overBudget ?? base.overBudget,
    };
  }

  private buildWhoReply(prompt: string): Omit<ChatMessage, 'id' | 'role'> {
    const names = this.applicantNames().slice(0, 5);
    return {
      content: names.length ? prompt : `${prompt} (no applicants loaded yet)`,
      intent: 'clarify',
      chips: names.length ? names : ['Show commands'],
    };
  }

  private buildHistory(): AssistantHistoryItem[] {
    return this.messages()
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
  }

  private pushUser(content: string): void {
    this.messages.update((list) => [
      ...list,
      { id: crypto.randomUUID(), role: 'user', content },
    ]);
    queueMicrotask(() => this.scrollToBottom());
  }

  private pushAssistant(msg: Omit<ChatMessage, 'id' | 'role'>): void {
    this.messages.update((list) => [
      ...list,
      { id: crypto.randomUUID(), role: 'assistant', ...msg },
    ]);
    queueMicrotask(() => this.scrollToBottom());
  }

  private scrollToBottom(): void {
    this.messagesEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }
}
