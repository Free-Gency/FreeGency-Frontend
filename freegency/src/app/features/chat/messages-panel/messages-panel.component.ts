import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  Add01Icon,
  AddCircleIcon,
  Cancel01Icon,
  CheckListIcon,
  Delete02Icon,
  DocumentAttachmentIcon,
  File01Icon,
  Image01Icon,
  SentIcon,
  Task01Icon,
  Video01Icon,
} from '@hugeicons/core-free-icons';
import { ChatApiService } from '../chat-api.service';
import { ChatSignalrService } from '../../../core/Signalr/chat-signalr-service';
import { AuthService } from '../../../core/auth/auth.service';
import { extractApiError } from '../../../core/http/api-error';
import { TeamsService } from '../../developer/data-access/teams.service';
import { TeamMemberRow } from '../../developer/models/team';
import { ProjectMilestonesApiService } from '../../project/data-access/project-milestones-api.service';
import {
  MilestonePlanItem,
  MilestonePlanVersion,
} from '../../project/models/milestone-plan';
import {
  ChatRoom,
  RoomMessage,
  RoomUpdated,
  chatRoomAvatarUrl,
  chatRoomDisplayTitle,
  chatRoomSortKey,
} from '../../../shared/models/ChatModel/chat';

export type MessagesPanelMode = 'personal' | 'team';
export type InboxListFilter = 'active' | 'discussions' | 'groups' | 'projects' | 'archived';
export type InboxRoomKind = 'discussion' | 'group' | 'project' | 'archived';
export type AttachKind = 'image' | 'video' | 'document' | 'any';

interface PlanDraftRow {
  title: string;
  definitionOfDone: string;
  amount: number | null;
  dueDate: string;
}

@Component({
  selector: 'app-messages-panel',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, HugeiconsIconComponent],
  templateUrl: './messages-panel.component.html',
  styleUrl: './messages-panel.component.css',
})
export class MessagesPanelComponent implements OnInit, OnDestroy {
  private readonly chatApi = inject(ChatApiService);
  private readonly chatSignalr = inject(ChatSignalrService);
  private readonly auth = inject(AuthService);
  private readonly teamsApi = inject(TeamsService);
  private readonly milestonesApi = inject(ProjectMilestonesApiService);

  protected readonly addIcon = Add01Icon as IconSvgObject;
  protected readonly addCircleIcon = AddCircleIcon as IconSvgObject;
  protected readonly imageIcon = Image01Icon as IconSvgObject;
  protected readonly videoIcon = Video01Icon as IconSvgObject;
  protected readonly documentIcon = DocumentAttachmentIcon as IconSvgObject;
  protected readonly fileIcon = File01Icon as IconSvgObject;
  protected readonly sendIcon = SentIcon as IconSvgObject;
  protected readonly planIcon = Task01Icon as IconSvgObject;
  protected readonly checklistIcon = CheckListIcon as IconSvgObject;
  protected readonly deleteIcon = Delete02Icon as IconSvgObject;
  protected readonly closeIcon = Cancel01Icon as IconSvgObject;

  /** personal = profile inbox; team = team-scoped rooms */
  readonly mode = input<MessagesPanelMode>('personal');
  readonly teamId = input<string | null>(null);
  /** Fallback when API rooms still say "General" */
  readonly teamName = input<string | null>(null);
  readonly teamLogo = input<string | null>(null);
  readonly initialRoomId = input<string | null>(null);
  /** Compact height when embedded in team detail */
  readonly embedded = input(false);
  /** Leaders see negotiation section labels */
  readonly isLeader = input(true);

  private readonly messagesScroll = viewChild<ElementRef<HTMLElement>>('messagesScroll');
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  private shouldStickToBottom = true;
  private destroyListeners = false;
  private scrollRaf = 0;
  private readonly onReceiveMessage = (message: RoomMessage) => this.handleReceiveMessage(message);
  private readonly onRoomUpdated = (update: RoomUpdated) => this.handleRoomUpdated(update);
  private readonly onOnlineStatus = (online: boolean) => {
    if (!this.destroyListeners) this.isOtherOnline.set(online);
  };
  private readonly onProfileOnline = (profileId: string) => {
    if (this.destroyListeners) return;
    if (this.sameProfileId(profileId, this.watchedPeerId())) {
      this.isOtherOnline.set(true);
    }
  };
  private readonly onProfileOffline = (profileId: string) => {
    if (this.destroyListeners) return;
    if (this.sameProfileId(profileId, this.watchedPeerId())) {
      this.isOtherOnline.set(false);
    }
  };

  protected readonly chatRooms = signal<ChatRoom[]>([]);
  protected readonly selectedRoom = signal<ChatRoom | null>(null);
  protected readonly messages = signal<RoomMessage[]>([]);
  protected readonly messageText = signal('');
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly selectedFilePreview = signal<string | null>(null);
  protected readonly attachMenuOpen = signal(false);
  protected readonly attachAccept = signal('*/*');
  protected readonly loading = signal(false);
  protected readonly messagesLoading = signal(false);
  protected readonly sending = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly search = signal('');
  protected readonly isOtherOnline = signal(false);
  /** 1:1 peer profile currently watched for presence. */
  private readonly watchedPeerId = signal<string | null>(null);
  protected readonly listFilter = signal<InboxListFilter>('active');

  protected readonly createGroupOpen = signal(false);
  protected readonly createGroupTitle = signal('');
  protected readonly createGroupMembers = signal<TeamMemberRow[]>([]);
  protected readonly createGroupSelected = signal<string[]>([]);
  protected readonly createGroupLoading = signal(false);
  protected readonly createGroupSaving = signal(false);
  protected readonly createGroupError = signal<string | null>(null);

  protected readonly manageOpen = signal(false);
  protected readonly manageTitle = signal('');
  protected readonly manageLogoFile = signal<File | null>(null);
  protected readonly manageLogoPreview = signal<string | null>(null);
  protected readonly manageTeamMembers = signal<TeamMemberRow[]>([]);
  protected readonly manageExistingUserIds = signal<string[]>([]);
  protected readonly manageSelected = signal<string[]>([]);
  protected readonly manageLoading = signal(false);
  protected readonly manageSaving = signal(false);
  protected readonly manageError = signal<string | null>(null);

  protected readonly canManageSelectedRoom = computed(() => {
    if (this.mode() !== 'team' || !this.isLeader()) return false;
    const room = this.selectedRoom();
    return !!room && (room.roomType === 'TeamMain' || room.roomType === 'TeamGroup');
  });

  protected readonly plansById = signal<Record<string, MilestonePlanVersion>>({});
  protected readonly latestPlan = signal<MilestonePlanVersion | null>(null);
  protected readonly plansLoading = signal(false);
  protected readonly planActionBusy = signal(false);
  protected readonly planActionError = signal<string | null>(null);

  protected readonly proposeOpen = signal(false);
  protected readonly proposeSaving = signal(false);
  protected readonly proposeError = signal<string | null>(null);
  protected readonly proposeRows = signal<PlanDraftRow[]>([]);
  protected readonly proposeNote = signal('');

  protected readonly changesOpen = signal(false);
  protected readonly changesPlanId = signal<string | null>(null);
  protected readonly changesComment = signal('');
  protected readonly changesSaving = signal(false);
  protected readonly changesError = signal<string | null>(null);

  protected readonly acceptOpen = signal(false);
  protected readonly acceptPlanId = signal<string | null>(null);
  protected readonly acceptProjectId = signal<string | null>(null);

  protected readonly isClientMode = computed(
    () => this.auth.session()?.activeProfileMode === 'Client',
  );
  protected readonly isDeveloperMode = computed(
    () => this.auth.session()?.activeProfileMode === 'Developer',
  );

  protected readonly canProposePlan = computed(() => {
    const room = this.selectedRoom();
    if (!this.isDiscussionRoom(room)) return false;
    if (!this.isDeveloperMode() || room!.canSend === false) return false;
    if (!this.hasGuid(room!.projectId) || !this.hasGuid(room!.proposalId)) return false;
    const latest = this.latestPlan();
    if (!latest) return true;
    return latest.status === 'ChangesRequested';
  });

  /** Discussion composer strip: propose CTA or waiting / read-only hint. */
  protected readonly discussionPlanHint = computed(() => {
    const room = this.selectedRoom();
    if (!this.isDiscussionRoom(room)) return null;

    const latest = this.latestPlan();

    if (this.isClientMode()) {
      if (!this.isProjectClient(room)) return null;
      if (latest?.status === 'Proposed') {
        return 'Review the milestone plan above — Accept to hire, or Request changes.';
      }
      if (latest?.status === 'ChangesRequested') {
        return 'Waiting for the developer to send a revised plan.';
      }
      return null;
    }

    if (!this.isDeveloperMode()) return null;
    if (room!.canSend === false) {
      return 'Only the negotiation speaker can propose a milestone plan.';
    }
    if (!this.hasGuid(room!.projectId) || !this.hasGuid(room!.proposalId)) {
      return 'This discussion is missing project link data. Re-open the discussion or refresh.';
    }
    if (latest?.status === 'Proposed') {
      return `Milestone plan v${latest.version} is awaiting the client (Accept or Request changes).`;
    }
    if (latest?.status === 'Accepted') {
      return 'Plan accepted — this negotiation will archive and a project room opens.';
    }
    return null;
  });

  protected readonly proposeButtonLabel = computed(() => {
    const latest = this.latestPlan();
    if (latest?.status === 'ChangesRequested') {
      return `Propose revised plan (v${latest.version + 1})`;
    }
    return 'Propose Milestone Plan';
  });

  protected readonly filteredRooms = computed(() => {
    const q = this.search().trim().toLowerCase();
    const filter = this.listFilter();
    let rooms = this.chatRooms();

    switch (filter) {
      case 'active':
        rooms = rooms.filter((r) => r.status !== 'Archived');
        break;
      case 'discussions':
        rooms = rooms.filter((r) => r.roomType === 'Proposal' && r.status !== 'Archived');
        break;
      case 'groups':
        rooms = rooms.filter(
          (r) =>
            (r.roomType === 'TeamGroup' || r.roomType === 'TeamMain') && r.status !== 'Archived',
        );
        break;
      case 'projects':
        rooms = rooms.filter((r) => r.roomType === 'Project' && r.status !== 'Archived');
        break;
      case 'archived':
        rooms = rooms.filter((r) => r.status === 'Archived');
        break;
    }

    if (q) {
      rooms = rooms.filter((r) => {
        const title = chatRoomDisplayTitle(r).toLowerCase();
        const last = (r.lastMessage || '').toLowerCase();
        return title.includes(q) || last.includes(q);
      });
    }

    return [...rooms].sort((a, b) => chatRoomSortKey(b) - chatRoomSortKey(a));
  });

  protected readonly inboxFilterCounts = computed(() => {
    const rooms = this.chatRooms();
    return {
      active: rooms.filter((r) => r.status !== 'Archived').length,
      discussions: rooms.filter((r) => r.roomType === 'Proposal' && r.status !== 'Archived').length,
      groups: rooms.filter(
        (r) =>
          (r.roomType === 'TeamGroup' || r.roomType === 'TeamMain') && r.status !== 'Archived',
      ).length,
      projects: rooms.filter((r) => r.roomType === 'Project' && r.status !== 'Archived').length,
      archived: rooms.filter((r) => r.status === 'Archived').length,
    };
  });

  protected readonly canCompose = computed(() => {
    const room = this.selectedRoom();
    if (!room) return false;
    if (room.status === 'Archived') return false;

    // Team Management Messages: compose only on Proposal/Project (leader CanSend rules).
    // TeamMain / TeamGroup: send from personal inbox instead.
    if (this.mode() === 'team') {
      if (room.roomType === 'TeamMain' || room.roomType === 'TeamGroup') return false;
      if (room.roomType === 'Proposal' || room.roomType === 'Project') {
        return room.canSend !== false;
      }
      return false;
    }

    return room.canSend !== false;
  });

  protected readonly composeHint = computed(() => {
    const room = this.selectedRoom();
    if (!room) return '';
    if (room.status === 'Archived') return 'This negotiation is archived after hire. History is read-only.';

    if (this.mode() === 'team' && (room.roomType === 'TeamMain' || room.roomType === 'TeamGroup')) {
      return 'Send from your inbox';
    }

    if (room.canSend === false) {
      return room.roleLabel
        ? `Read only · ${room.roleLabel}`
        : 'Read only · another leader is the negotiation speaker';
    }
    return '';
  });

  protected authSessionUserId(): string | null {
    return this.auth.session()?.id ?? null;
  }

  constructor() {
    effect(() => {
      const msgs = this.messages();
      if (msgs.length && this.shouldStickToBottom) {
        untracked(() => this.queueScrollToBottom('smooth'));
      }
    });
  }

  ngOnInit(): void {
    this.wireSignalR();
    this.loadChatRooms();
  }

 async ngOnDestroy(): Promise<void> {
   if (this.joinedRoomId) {
    await this.chatSignalr.leaveRoom(this.joinedRoomId);
    this.joinedRoomId = null;
  }
    this.destroyListeners = true;
    if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
    this.setSelectedFile(null);
    this.chatSignalr.unlistenReceiveMessage(this.onReceiveMessage);
    this.chatSignalr.unlistenRoomUpdated(this.onRoomUpdated);
    this.chatSignalr.unlistenOnlineStatus(this.onOnlineStatus);
    this.chatSignalr.unlistenProfileOnline(this.onProfileOnline);
    this.chatSignalr.unlistenProfileOffline(this.onProfileOffline);
  }

  protected displayTitle(room: ChatRoom): string {
    return chatRoomDisplayTitle(room);
  }

  protected avatarUrl(room: ChatRoom): string | null {
    return chatRoomAvatarUrl(room);
  }

  protected isDiscussionRoom(room: ChatRoom | null | undefined): boolean {
    return !!room && room.roomType === 'Proposal' && room.status !== 'Archived';
  }

  protected roomKind(room: ChatRoom): InboxRoomKind {
    if (room.status === 'Archived') return 'archived';
    if (room.roomType === 'Proposal') return 'discussion';
    if (room.roomType === 'Project') return 'project';
    if (room.roomType === 'TeamMain' || room.roomType === 'TeamGroup') return 'group';
    return 'discussion';
  }

  protected roomKindLabel(room: ChatRoom): string {
    switch (this.roomKind(room)) {
      case 'discussion':
        return 'Discussion';
      case 'group':
        return room.roomType === 'TeamMain' ? 'Team chat' : 'Group';
      case 'project':
        return 'Project';
      case 'archived':
        return 'Archived';
    }
  }

  protected roomStatusLabel(room: ChatRoom): string {
    if (room.status === 'Archived') return 'Archived';
    if (room.canSend === false) return 'Read only';
    return this.roomKindLabel(room);
  }

  protected roomMeta(room: ChatRoom): string {
    const bits: string[] = [this.roomKindLabel(room)];
    if (this.mode() === 'team' && (room.roomType === 'TeamMain' || room.roomType === 'TeamGroup')) {
      bits.push('Send from your inbox');
      return bits.join(' · ');
    }
    if (room.status === 'Archived') return 'Archived · read only';
    if (room.canSend) bits.push('You can send');
    else bits.push('View only');
    return bits.join(' · ');
  }

  protected setListFilter(filter: InboxListFilter): void {
    this.listFilter.set(filter);
  }

  protected clearSelection(): void {
    this.selectedRoom.set(null);
    this.messages.set([]);
    this.messageText.set('');
    this.setSelectedFile(null);
    this.plansById.set({});
    this.latestPlan.set(null);
    this.planActionError.set(null);
  }

  private hasGuid(value: string | null | undefined): boolean {
    if (!value) return false;
    const v = value.trim().toLowerCase();
    return v.length > 0 && v !== '00000000-0000-0000-0000-000000000000';
  }

  private normalizeRoom(room: ChatRoom): ChatRoom {
    const raw = room as ChatRoom & {
      ProjectId?: string | null;
      ProposalId?: string | null;
      projectID?: string | null;
      proposalID?: string | null;
    };
    const projectId = this.hasGuid(raw.projectId)
      ? raw.projectId
      : this.hasGuid(raw.ProjectId)
        ? raw.ProjectId
        : this.hasGuid(raw.projectID)
          ? raw.projectID
          : null;
    const proposalId = this.hasGuid(raw.proposalId)
      ? raw.proposalId
      : this.hasGuid(raw.ProposalId)
        ? raw.ProposalId
        : this.hasGuid(raw.proposalID)
          ? raw.proposalID
          : null;
    return { ...room, projectId, proposalId };
  }

  protected openCreateGroup(): void {
    const teamId = this.teamId();
    if (!teamId || !this.isLeader()) return;

    this.createGroupOpen.set(true);
    this.createGroupTitle.set('');
    this.createGroupError.set(null);
    this.createGroupSelected.set([]);
    this.createGroupLoading.set(true);

    this.teamsApi.getMembers(teamId).subscribe({
      next: (rows) => {
        this.createGroupMembers.set(rows);
        const me = this.auth.session()?.id;
        this.createGroupSelected.set(
          rows.filter((r) => r.userId === me || r.isOwner).map((r) => r.userId),
        );
        if (me && !this.createGroupSelected().includes(me)) {
          this.createGroupSelected.update((ids) => [...ids, me]);
        }
        this.createGroupLoading.set(false);
      },
      error: (err) => {
        this.createGroupError.set(extractApiError(err) || 'Failed to load members.');
        this.createGroupLoading.set(false);
      },
    });
  }

  protected closeCreateGroup(): void {
    this.createGroupOpen.set(false);
    this.createGroupError.set(null);
  }

  protected toggleCreateGroupMember(userId: string): void {
    const me = this.auth.session()?.id;
    if (userId === me) return;
    this.createGroupSelected.update((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId],
    );
  }

  protected isCreateGroupSelected(userId: string): boolean {
    return this.createGroupSelected().includes(userId);
  }

  protected submitCreateGroup(): void {
    const teamId = this.teamId();
    const title = this.createGroupTitle().trim();
    if (!teamId || !title || this.createGroupSaving()) return;

    this.createGroupSaving.set(true);
    this.createGroupError.set(null);
    this.teamsApi
      .createTeamGroup(teamId, {
        title,
        memberUserIds: this.createGroupSelected(),
      })
      .subscribe({
        next: (roomId) => {
          this.createGroupSaving.set(false);
          this.createGroupOpen.set(false);
          this.listFilter.set('groups');
          this.loadChatRooms(false);
          // Open after short delay so list refresh can land
          setTimeout(() => {
            const room = this.chatRooms().find((r) => r.id === roomId);
            if (room) this.openChat(room);
            else this.loadChatRooms(true);
          }, 400);
        },
        error: (err) => {
          this.createGroupSaving.set(false);
          this.createGroupError.set(extractApiError(err) || 'Failed to create group.');
        },
      });
  }

  protected openManageRoom(): void {
    const teamId = this.teamId();
    const room = this.selectedRoom();
    if (!teamId || !room || !this.canManageSelectedRoom()) return;

    this.revokeManageLogoPreview();
    this.manageOpen.set(true);
    this.manageTitle.set(room.title || room.teamName || '');
    this.manageLogoFile.set(null);
    this.manageLogoPreview.set(room.logo || room.teamLogo || null);
    this.manageError.set(null);
    this.manageSelected.set([]);
    this.manageLoading.set(true);

    let teamLoaded = false;
    let roomLoaded = false;
    const maybeDone = () => {
      if (teamLoaded && roomLoaded) this.manageLoading.set(false);
    };

    this.teamsApi.getMembers(teamId).subscribe({
      next: (rows) => {
        this.manageTeamMembers.set(rows);
        teamLoaded = true;
        maybeDone();
      },
      error: (err) => {
        this.manageError.set(extractApiError(err) || 'Failed to load team members.');
        teamLoaded = true;
        maybeDone();
      },
    });

    this.teamsApi.getTeamChatRoomMembers(teamId, room.id).subscribe({
      next: (rows) => {
        this.manageExistingUserIds.set(rows.map((r) => r.userId));
        roomLoaded = true;
        maybeDone();
      },
      error: (err) => {
        this.manageError.set(extractApiError(err) || 'Failed to load chat members.');
        roomLoaded = true;
        maybeDone();
      },
    });
  }

  protected closeManageRoom(): void {
    this.manageOpen.set(false);
    this.manageError.set(null);
    this.revokeManageLogoPreview();
    this.manageLogoFile.set(null);
  }

  protected onManageLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.revokeManageLogoPreview();
    this.manageLogoFile.set(file);
    this.manageLogoPreview.set(file ? URL.createObjectURL(file) : this.selectedRoom()?.logo || this.selectedRoom()?.teamLogo || null);
    input.value = '';
  }

  protected clearManageLogoFile(): void {
    this.revokeManageLogoPreview();
    this.manageLogoFile.set(null);
    const room = this.selectedRoom();
    this.manageLogoPreview.set(room?.logo || room?.teamLogo || null);
  }

  protected isAlreadyInChat(userId: string): boolean {
    return this.manageExistingUserIds().includes(userId);
  }

  protected toggleManageMember(userId: string): void {
    if (this.isAlreadyInChat(userId)) return;
    this.manageSelected.update((ids) =>
      ids.includes(userId) ? ids.filter((id) => id !== userId) : [...ids, userId],
    );
  }

  protected isManageSelected(userId: string): boolean {
    return this.manageSelected().includes(userId);
  }

  protected submitManageRoom(): void {
    const teamId = this.teamId();
    const room = this.selectedRoom();
    if (!teamId || !room || this.manageSaving()) return;

    const title = this.manageTitle().trim();
    const logo = this.manageLogoFile();
    const addIds = this.manageSelected();
    const titleChanged = title && title !== (room.title || '').trim();
    const needsMetaUpdate = !!titleChanged || !!logo;

    if (!needsMetaUpdate && addIds.length === 0) {
      this.manageError.set('Change the name/logo or select members to add.');
      return;
    }

    this.manageSaving.set(true);
    this.manageError.set(null);

    const afterMeta = () => {
      if (addIds.length === 0) {
        this.finishManageSuccess(room.id);
        return;
      }
      this.teamsApi.addTeamChatRoomMembers(teamId, room.id, addIds).subscribe({
        next: () => this.finishManageSuccess(room.id),
        error: (err) => {
          this.manageSaving.set(false);
          this.manageError.set(extractApiError(err) || 'Failed to add members.');
          this.loadChatRooms(false);
          this.loadMessages(room.id);
        },
      });
    };

    if (needsMetaUpdate) {
      this.teamsApi
        .updateTeamChatRoom(teamId, room.id, {
          title: titleChanged ? title : undefined,
          logo,
        })
        .subscribe({
          next: () => afterMeta(),
          error: (err) => {
            this.manageSaving.set(false);
            this.manageError.set(extractApiError(err) || 'Failed to update chat.');
          },
        });
    } else {
      afterMeta();
    }
  }

  private finishManageSuccess(roomId: string): void {
    this.manageSaving.set(false);
    this.closeManageRoom();
    this.loadChatRooms(false);
    this.loadMessages(roomId);
    // Refresh selected room fields from list after short delay
    setTimeout(() => {
      const updated = this.chatRooms().find((r) => r.id === roomId);
      if (updated) this.selectedRoom.set(updated);
    }, 300);
  }

  private revokeManageLogoPreview(): void {
    const url = this.manageLogoPreview();
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
  }
  private joinedRoomId: string | null = null;

  protected async openChat(room: ChatRoom):Promise< void> {
    if (this.joinedRoomId && this.joinedRoomId !== room.id) {
     await this.chatSignalr.leaveRoom(this.joinedRoomId);
  }

   this.chatSignalr.joinRoom(room.id);
  this.joinedRoomId = room.id;
    this.shouldStickToBottom = true;
    this.closeAttachMenu();
    this.selectedRoom.set(room);
    this.messages.set([]);
    this.messageText.set('');
    this.setSelectedFile(null);
    this.planActionError.set(null);
    this.isOtherOnline.set(false);
    this.watchedPeerId.set(null);
    this.loadMessages(room.id);
    this.refreshPeerPresence(room.otherProfileId ?? null);
    this.loadPlansForRoom(room);
    this.chatApi.markAsRead(room.id).subscribe({
      next: () => {
        this.chatRooms.update((rooms) =>
          rooms.map((r) => (r.id === room.id ? { ...r, unreadCount: 0 } : r)),
        );
      },
      error: () => undefined,
    });
  }

  protected onMessagesScroll(): void {
    const el = this.messagesScroll()?.nativeElement;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.shouldStickToBottom = distance < 96;
  }

  protected toggleAttachMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.attachMenuOpen.update((open) => !open);
  }

  protected closeAttachMenu(): void {
    this.attachMenuOpen.set(false);
  }

  protected pickAttachment(kind: AttachKind, event: MouseEvent): void {
    event.stopPropagation();
    const acceptByKind: Record<AttachKind, string> = {
      image: 'image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp',
      video: 'video/mp4,video/webm,video/quicktime,video/*',
      document:
        '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,application/pdf',
      any: '*/*',
    };
    this.attachAccept.set(acceptByKind[kind]);
    this.attachMenuOpen.set(false);
    queueMicrotask(() => this.fileInput()?.nativeElement.click());
  }

  @HostListener('document:click')
  protected onDocumentClick(): void {
    this.closeAttachMenu();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.setSelectedFile(file);
    input.value = '';
  }

  protected clearFile(): void {
    this.setSelectedFile(null);
  }

  protected isImageAttachment(fileName?: string | null, fileUrl?: string | null): boolean {
    const name = `${fileName || ''} ${fileUrl || ''}`.toLowerCase();
    return /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i.test(name) || name.includes('image/');
  }

  protected fileExtLabel(fileName?: string | null): string {
    const ext = (fileName || '').split('.').pop()?.trim().toUpperCase();
    if (!ext || ext.length > 5) return 'FILE';
    return ext;
  }

  protected formatFileSize(bytes: number): string {
    if (!bytes || bytes < 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private setSelectedFile(file: File | null): void {
    const prev = this.selectedFilePreview();
    if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);

    this.selectedFile.set(file);
    if (file && file.type.startsWith('image/')) {
      this.selectedFilePreview.set(URL.createObjectURL(file));
    } else {
      this.selectedFilePreview.set(null);
    }
  }

  protected sendMessage(): void {
    const room = this.selectedRoom();
    if (!room || !this.canCompose() || this.sending()) return;

    const text = this.messageText().trim();
    const file = this.selectedFile();
    if (!text && !file) return;

    this.sending.set(true);
    this.chatApi.sendMessage(room.id, text, file).subscribe({
      next: (msg) => {
        this.messageText.set('');
        this.setSelectedFile(null);
        this.sending.set(false);
        this.shouldStickToBottom = true;
        this.appendMessage({
          ...msg,
          id: msg.id,
          chatRoomId: msg.chatRoomId || room.id,
          isMine: true,
          createdAt: msg.createdAt || new Date().toISOString(),
          messageType: msg.messageType || (file ? 'Attachment' : 'Text'),
          otherProfileId: msg.otherProfileId ?? null,
        });
        this.patchRoomPreview(room.id, {
          lastMessage: msg.text || msg.fileName || text || 'Attachment',
          lastMessageType: msg.messageType || (file ? 'Attachment' : 'Text'),
          lastMessageAt: msg.createdAt || new Date().toISOString(),
          lastMessageSender: msg.senderName || 'You',
        });
      },
      error: (err) => {
        this.sending.set(false);
        this.error.set(err?.error?.detail || err?.error?.title || 'Failed to send message');
      },
    });
  }

  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  protected isSystem(message: RoomMessage): boolean {
    return message.messageType === 'System';
  }

  /** Structured layout for hire / project-start system notices (new + legacy text). */
  protected systemMessageParts(
    message: RoomMessage,
  ): { kicker: string; title: string | null; detail: string | null } | null {
    const text = (message.text || '').trim();
    if (!text) return null;

    // New format: Project started|{title}|{detail}
    const pipeParts = text.split('|').map((p) => p.trim()).filter(Boolean);
    if (pipeParts.length >= 2 && /^project started$/i.test(pipeParts[0])) {
      return {
        kicker: 'Project started',
        title: pipeParts[1] || null,
        detail: pipeParts[2] || null,
      };
    }

    // Legacy: "Project started — {title}. Milestone plan agreed. …"
    const legacy = text.match(
      /^Project started\s*[—–-]\s*(.+?)\.\s*(Milestone plan agreed\.?\s*)?(.*)$/i,
    );
    if (legacy) {
      const title = legacy[1]?.trim() || null;
      const detail = [legacy[2], legacy[3]]
        .map((p) => (p || '').trim())
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .replace(/\.\s*$/, '')
        .trim();
      return {
        kicker: 'Project started',
        title,
        detail: detail || 'Milestone plan agreed',
      };
    }

    return null;
  }

  protected isPlan(message: RoomMessage): boolean {
    if ((message.planVersionId || '').trim()) return true;
    const type = String(message.messageType || '').toLowerCase();
    if (type === 'milestoneplan' || type === '3') return true;
    return /^milestone plan\b/i.test((message.text || '').trim());
  }

  /** Messages plus any plan versions missing a chat row (legacy / failed inserts). */
  protected readonly threadMessages = computed(() => {
    const room = this.selectedRoom();
    const base = this.messages();
    if (!room || (room.roomType !== 'Proposal' && room.roomType !== 'Project')) {
      return base;
    }

    const plans = Object.values(this.plansById()).sort((a, b) => a.version - b.version);
    if (!plans.length) return base;

    const covered = new Set<string>();
    for (const message of base) {
      if (!this.isPlan(message)) continue;
      const id = (message.planVersionId || '').trim().toLowerCase();
      if (id) covered.add(id);

      const match = (message.text || '').match(/\bv(?:ersion\s*)?(\d+)\b/i);
      if (match) {
        const version = Number(match[1]);
        const byVersion = plans.find((p) => p.version === version);
        if (byVersion) covered.add(byVersion.id.toLowerCase());
      }
    }

    const extras = plans
      .filter((plan) => !covered.has(plan.id.toLowerCase()))
      .map((plan) => this.syntheticPlanMessage(plan, room.id));

    if (!extras.length) return base;

    // Keep chronological order — never pin synthetic plan cards under new messages.
    return [...base, ...extras].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  });

  protected planForMessage(message: RoomMessage): MilestonePlanVersion | null {
    const map = this.plansById();
    const id = (message.planVersionId || '').trim();
    if (id) {
      if (map[id]) return map[id];
      const byId = Object.values(map).find((p) => p.id.toLowerCase() === id.toLowerCase());
      if (byId) return byId;
    }

    const match = (message.text || '').match(/\bv(?:ersion\s*)?(\d+)\b/i);
    if (match) {
      const version = Number(match[1]);
      const byVersion = Object.values(map).find((p) => p.version === version);
      if (byVersion) return byVersion;
    }

    // Only fall back when a single plan exists (avoids every plan bubble showing the latest).
    if (this.isPlan(message)) {
      const plans = Object.values(map);
      if (plans.length === 1) return plans[0];
    }
    return null;
  }

  private syntheticPlanMessage(plan: MilestonePlanVersion, roomId: string): RoomMessage {
    return {
      id: `plan-${plan.id}`,
      chatRoomId: roomId,
      senderId: null,
      senderName: null,
      senderProfileType: 'Developer',
      messageType: 'MilestonePlan',
      text: `Milestone Plan v${plan.version} proposed.`,
      planVersionId: plan.id,
      createdAt: plan.createdAt || new Date().toISOString(),
      isMine: this.isDeveloperMode(),
      otherProfileId: null,
    };
  }

  protected readonly maxPlanVersions = 6;

  protected planStatusLabel(status: string | null | undefined): string {
    const value = String(status || 'Proposed');
    if (/changesrequested/i.test(value.replace(/\s+/g, ''))) return 'Changes Requested';
    if (/accepted/i.test(value)) return 'Accepted';
    return 'Proposed';
  }

  protected planSubtitle(plan: MilestonePlanVersion): string {
    if (plan.status === 'ChangesRequested' && plan.changeComment) {
      return plan.changeComment;
    }
    if (plan.version > 1) return 'Refined based on our initial discussion.';
    return 'Proposed for this negotiation.';
  }

  protected planTotal(plan: MilestonePlanVersion): number {
    return (plan.items ?? []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }

  protected itemTag(item: MilestonePlanItem): string | null {
    return item.changeTag || null;
  }

  protected canClientActOnPlan(plan: MilestonePlanVersion): boolean {
    const room = this.selectedRoom();
    if (!this.isDiscussionRoom(room) || !this.isProjectClient(room) || room!.canSend === false) {
      return false;
    }
    const latest = this.latestPlan();
    return !!latest && latest.id === plan.id && plan.status === 'Proposed';
  }

  /** True when this membership is the project client (not a developer who switched UI mode). */
  private isProjectClient(room: ChatRoom | null | undefined): boolean {
    if (!room || !this.isClientMode()) return false;
    const label = (room.roleLabel || '').trim().toLowerCase();
    return label === 'client';
  }

  protected canDeveloperReviseFromPlan(plan: MilestonePlanVersion): boolean {
    const room = this.selectedRoom();
    if (!this.isDiscussionRoom(room) || !this.isDeveloperMode() || room!.canSend === false) {
      return false;
    }
    const latest = this.latestPlan();
    return !!latest && latest.id === plan.id && plan.status === 'ChangesRequested';
  }

  protected openProposePlan(seedFromLatest = false): void {
    const room = this.selectedRoom();
    if (!room || !this.canProposePlan()) return;

    const latest = this.latestPlan();
    const rows: PlanDraftRow[] =
      seedFromLatest && latest?.items?.length
        ? latest.items
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              title: item.title,
              definitionOfDone: item.definitionOfDone,
              amount: item.amount,
              dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
            }))
        : [
            { title: '', definitionOfDone: '', amount: null, dueDate: '' },
            { title: '', definitionOfDone: '', amount: null, dueDate: '' },
          ];

    this.proposeRows.set(rows);
    this.proposeNote.set('');
    this.proposeError.set(null);
    this.proposeOpen.set(true);
  }

  protected closeProposePlan(): void {
    this.proposeOpen.set(false);
    this.proposeError.set(null);
  }

  protected addProposeRow(): void {
    this.proposeRows.update((rows) => [
      ...rows,
      { title: '', definitionOfDone: '', amount: null, dueDate: '' },
    ]);
  }

  protected removeProposeRow(index: number): void {
    this.proposeRows.update((rows) => (rows.length <= 1 ? rows : rows.filter((_, i) => i !== index)));
  }

  protected updateProposeRow(index: number, patch: Partial<PlanDraftRow>): void {
    this.proposeRows.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  protected submitProposePlan(): void {
    const room = this.selectedRoom();
    if (!room?.projectId || !room.proposalId || this.proposeSaving()) return;

    const milestones = this.proposeRows()
      .map((row) => ({
        title: row.title.trim(),
        definitionOfDone: row.definitionOfDone.trim(),
        amount: Number(row.amount) || 0,
        dueDate: row.dueDate ? new Date(row.dueDate).toISOString() : null,
      }))
      .filter((m) => m.title && m.amount > 0);

    if (!milestones.length) {
      this.proposeError.set('Add at least one milestone with a title and amount.');
      return;
    }

    this.proposeSaving.set(true);
    this.proposeError.set(null);
    this.milestonesApi
      .proposePlan({
        projectId: room.projectId,
        proposalId: room.proposalId,
        milestones,
      })
      .subscribe({
        next: (plan) => {
          const normalized = this.normalizePlanVersion(plan);
          this.proposeSaving.set(false);
          this.proposeOpen.set(false);
          this.shouldStickToBottom = true;
          if (normalized?.id) {
            this.plansById.update((map) => ({ ...map, [normalized.id]: normalized }));
            this.latestPlan.set(normalized);
            this.appendMessage(this.syntheticPlanMessage(normalized, room.id));
          }
          this.loadPlansForRoom(room);
          this.loadMessages(room.id);
        },
        error: (err) => {
          this.proposeSaving.set(false);
          this.proposeError.set(extractApiError(err) || 'Failed to propose plan.');
        },
      });
  }

  protected openRequestChanges(plan: MilestonePlanVersion): void {
    this.changesPlanId.set(plan.id);
    this.changesComment.set('');
    this.changesError.set(null);
    this.changesOpen.set(true);
  }

  protected closeRequestChanges(): void {
    this.changesOpen.set(false);
    this.changesError.set(null);
  }

  protected submitRequestChanges(): void {
    const planId = this.changesPlanId();
    const comment = this.changesComment().trim();
    const room = this.selectedRoom();
    if (!planId || !room || this.changesSaving()) return;
    if (!comment) {
      this.changesError.set('Add one comment for the whole plan.');
      return;
    }

    this.changesSaving.set(true);
    this.changesError.set(null);
    this.milestonesApi.requestPlanChanges({ planVersionId: planId, comment }).subscribe({
      next: () => {
        this.changesSaving.set(false);
        this.changesOpen.set(false);
        this.shouldStickToBottom = true;
        this.loadPlansForRoom(room);
        this.loadMessages(room.id);
      },
      error: (err) => {
        this.changesSaving.set(false);
        this.changesError.set(extractApiError(err) || 'Failed to request changes.');
      },
    });
  }

  protected openAcceptPlan(plan: MilestonePlanVersion): void {
    this.planActionError.set(null);
    this.acceptPlanId.set(plan.id);
    this.acceptProjectId.set(plan.projectId);
    this.acceptOpen.set(true);
  }

  protected closeAcceptPlan(): void {
    this.acceptOpen.set(false);
    this.acceptPlanId.set(null);
    this.acceptProjectId.set(null);
  }

  protected confirmAcceptPlan(): void {
    const planId = this.acceptPlanId();
    const projectId = this.acceptProjectId();
    const room = this.selectedRoom();
    if (!planId || !room || this.planActionBusy()) return;

    this.planActionBusy.set(true);
    this.planActionError.set(null);
    this.milestonesApi.acceptPlan(planId).subscribe({
      next: () => {
        this.planActionBusy.set(false);
        this.closeAcceptPlan();
        // Close negotiation thread; open the new Project room after refresh.
        this.clearSelection();
        this.listFilter.set('projects');
        this.loadChatRooms(false, projectId ? { openProjectId: projectId } : undefined);
      },
      error: (err) => {
        this.planActionBusy.set(false);
        this.closeAcceptPlan();
        this.planActionError.set(extractApiError(err) || 'Failed to accept plan.');
      },
    });
  }

  protected dismissPlanActionError(): void {
    this.planActionError.set(null);
  }

  protected acceptPlan(plan: MilestonePlanVersion): void {
    this.openAcceptPlan(plan);
  }

  private loadPlansForRoom(room: ChatRoom | null): void {
    const projectId = this.resolveRoomProjectId(room);
    if (!projectId || (room!.roomType !== 'Proposal' && room!.roomType !== 'Project')) {
      this.plansById.set({});
      this.latestPlan.set(null);
      return;
    }

    // Keep selected room in sync when API enriched projectId from the proposal.
    if (room && room.projectId !== projectId) {
      const patched = { ...room, projectId };
      this.selectedRoom.set(patched);
      this.chatRooms.update((rooms) =>
        rooms.map((r) => (r.id === room.id ? { ...r, projectId } : r)),
      );
    }

    this.plansLoading.set(true);
    this.milestonesApi.getPlanVersions(projectId).subscribe({
      next: (versions) => {
        const map: Record<string, MilestonePlanVersion> = {};
        const normalizedList = (versions ?? [])
          .map((v) => this.normalizePlanVersion(v))
          .filter((v): v is MilestonePlanVersion => !!v?.id);
        for (const v of normalizedList) {
          map[v.id] = {
            ...v,
            items: [...(v.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
          };
        }
        this.plansById.set(map);
        const latest =
          [...normalizedList].sort((a, b) => b.version - a.version)[0] ?? null;
        this.latestPlan.set(
          latest
            ? {
                ...latest,
                items: [...(latest.items ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
              }
            : null,
        );
        this.plansLoading.set(false);
        if (this.shouldStickToBottom) {
          this.queueScrollToBottom('smooth');
        }
      },
      error: () => {
        this.plansById.set({});
        this.latestPlan.set(null);
        this.plansLoading.set(false);
      },
    });
  }

  private resolveRoomProjectId(room: ChatRoom | null): string | null {
    if (!room) return null;
    if (this.hasGuid(room.projectId)) return room.projectId!;
    return null;
  }

  private normalizePlanVersion(raw: unknown): MilestonePlanVersion | null {
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const id = String(r['id'] ?? r['Id'] ?? '').trim();
    if (!id) return null;
    const itemsRaw = (r['items'] ?? r['Items'] ?? []) as unknown[];
    const items = itemsRaw.map((item, index) => {
      const it = (item ?? {}) as Record<string, unknown>;
      const tag = (it['changeTag'] ?? it['ChangeTag'] ?? null) as string | null;
      return {
        id: String(it['id'] ?? it['Id'] ?? `${id}-${index}`),
        title: String(it['title'] ?? it['Title'] ?? ''),
        definitionOfDone: String(it['definitionOfDone'] ?? it['DefinitionOfDone'] ?? ''),
        amount: Number(it['amount'] ?? it['Amount'] ?? 0),
        dueDate: (it['dueDate'] ?? it['DueDate'] ?? null) as string | null,
        sortOrder: Number(it['sortOrder'] ?? it['SortOrder'] ?? index + 1),
        changeTag: (tag === 'New' || tag === 'Updated' ? tag : null) as 'New' | 'Updated' | null,
      };
    });
    return {
      id,
      projectId: String(r['projectId'] ?? r['ProjectId'] ?? ''),
      proposalId: String(r['proposalId'] ?? r['ProposalId'] ?? ''),
      version: Number(r['version'] ?? r['Version'] ?? 1),
      status: this.normalizePlanStatus(r['status'] ?? r['Status']),
      changeComment: (r['changeComment'] ?? r['ChangeComment'] ?? null) as string | null,
      proposedByUserId: String(r['proposedByUserId'] ?? r['ProposedByUserId'] ?? ''),
      createdAt: String(r['createdAt'] ?? r['CreatedAt'] ?? new Date().toISOString()),
      items,
    };
  }

  private normalizePlanStatus(raw: unknown): string {
    const value = String(raw ?? 'Proposed').replace(/\s+/g, '');
    if (/changesrequested/i.test(value)) return 'ChangesRequested';
    if (/accepted/i.test(value)) return 'Accepted';
    return 'Proposed';
  }

  private wireSignalR(): void {
    void this.chatSignalr.ensureConnected();
    this.chatSignalr.listenReceiveMessage(this.onReceiveMessage);
    this.chatSignalr.listenRoomUpdated(this.onRoomUpdated);
    this.chatSignalr.listenOnlineStatus(this.onOnlineStatus);
    this.chatSignalr.listenProfileOnline(this.onProfileOnline);
    this.chatSignalr.listenProfileOffline(this.onProfileOffline);
  }

  private handleReceiveMessage(message: RoomMessage): void {
    if (this.destroyListeners) return;
    const room = this.selectedRoom();
    if (!room) return;
    const normalized = this.normalizeIncomingMessage(message, room.id);
    if (normalized.chatRoomId && normalized.chatRoomId !== room.id) return;

    this.appendMessage({
      ...normalized,
      isMine: normalized.isMine || normalized.senderId === this.auth.session()?.profileId,
    });

    if (
      this.isPlan(normalized) ||
      (normalized.text || '').toLowerCase().includes('request changes on plan')
    ) {
      this.loadPlansForRoom(room);
    }
  }

  private handleRoomUpdated(update: RoomUpdated): void {
    if (this.destroyListeners) return;
    this.chatRooms.update((rooms) => {
      const index = rooms.findIndex((r) => r.id === update.roomId);
      if (index === -1) {
        untracked(() => this.loadChatRooms(false));
        return rooms;
      }

      const room = {
        ...rooms[index],
        lastMessage: update.lastMessage,
        lastMessageType: update.lastMessageType,
        lastMessageAt: update.lastMessageAt,
        lastMessageSender: update.lastMessageSender,
        unreadCount:
          this.selectedRoom()?.id === update.roomId
            ? 0
            : update.senderId === this.auth.session()?.profileId
              ? rooms[index].unreadCount ?? 0
              : (rooms[index].unreadCount ?? 0) + 1,
      };

      const updated = [...rooms];
      updated.splice(index, 1);
      updated.unshift(room);
      return updated;
    });

    // Keep the open thread in sync — plan proposes often arrive as RoomUpdated
    // without a reliable ReceiveMessage on the other party.
    const selected = this.selectedRoom();
    if (selected?.id === update.roomId) {
      this.shouldStickToBottom = true;
      this.loadMessages(update.roomId);
      this.loadPlansForRoom(selected);
    }
  }

  private appendMessage(message: RoomMessage): void {
    if (!message.id) return;
    this.messages.update((old) => {
      if (old.some((m) => m.id === message.id)) return old;
      const planId = (message.planVersionId || '').trim().toLowerCase();
      if (planId) {
        const withoutSynthetic = old.filter(
          (m) =>
            !(
              m.id.startsWith('plan-') &&
              (m.planVersionId || '').trim().toLowerCase() === planId
            ),
        );
        return [...withoutSynthetic, message];
      }
      return [...old, message];
    });
    this.shouldStickToBottom = true;
  }

  private patchRoomPreview(
    roomId: string,
    patch: Partial<Pick<ChatRoom, 'lastMessage' | 'lastMessageType' | 'lastMessageAt' | 'lastMessageSender'>>,
  ): void {
    this.chatRooms.update((rooms) => {
      const index = rooms.findIndex((r) => r.id === roomId);
      if (index === -1) return rooms;
      const room = { ...rooms[index], ...patch };
      const updated = [...rooms];
      updated.splice(index, 1);
      updated.unshift(room);
      return updated;
    });
  }

  private loadChatRooms(
    showLoading = true,
    options?: { openProjectId?: string },
  ): void {
    if (showLoading) this.loading.set(true);
    this.error.set(null);

    this.chatApi
      .getChatRooms({
        pageNumber: 1,
        pageSize: 50,
        teamId: this.mode() === 'team' ? this.teamId() : null,
      })
      .subscribe({
        next: (res) => {
          const fallbackName = this.teamName();
          const fallbackLogo = this.teamLogo();
          const items = (res.items ?? []).map((r) => {
            const isTeamRoom = r.roomType === 'TeamMain' || r.roomType === 'TeamGroup';
            return this.normalizeRoom({
              ...r,
              canSend: r.canSend !== false,
              teamName: r.teamName || (isTeamRoom ? fallbackName : r.teamName) || null,
              teamLogo: r.teamLogo || (isTeamRoom ? fallbackLogo : r.teamLogo) || null,
              logo: r.logo || null,
              title:
                r.roomType === 'TeamMain'
                  ? (r.title || r.teamName || fallbackName || 'Team chat')
                  : r.title,
            });
          });
          this.chatRooms.set(items);
          this.loading.set(false);

          if (options?.openProjectId) {
            const projectRoom = items.find(
              (r) =>
                r.roomType === 'Project' &&
                r.projectId === options.openProjectId &&
                r.status !== 'Archived',
            );
            if (projectRoom) {
              this.openChat(projectRoom);
              return;
            }
            this.listFilter.set('active');
          }

          const initial = this.initialRoomId();
          if (initial && !this.selectedRoom()) {
            const match = items.find((r) => r.id === initial);
            if (match) this.openChat(match);
          }
        },
        error: () => {
          this.error.set('Failed to load conversations');
          this.loading.set(false);
        },
      });
  }

  private loadMessages(roomId: string): void {
    this.messagesLoading.set(true);
    this.chatApi.getMessages(roomId, 1, 80).subscribe({
      next: (res) => {
        const items = (res.items ?? []).map((m) => this.normalizeIncomingMessage(m, roomId));
        this.messages.set(items);
        this.messagesLoading.set(false);
        this.shouldStickToBottom = true;
        this.queueScrollToBottom('auto');

        const otherProfileId =
          items.find((m) => m.otherProfileId)?.otherProfileId ||
          items.find((m) => !m.isMine && m.senderId)?.senderId ||
          this.selectedRoom()?.otherProfileId ||
          null;
        this.refreshPeerPresence(otherProfileId);

        // If inbox preview says a plan was sent but the thread has no plan row yet,
        // force-load plans so the synthetic card can appear.
        const room = this.selectedRoom();
        if (
          room?.id === roomId &&
          !items.some((m) => this.isPlan(m)) &&
          this.looksLikePlanPreview(room.lastMessage, room.lastMessageType)
        ) {
          this.loadPlansForRoom(room);
        }
      },
      error: () => {
        this.messagesLoading.set(false);
        this.error.set('Failed to load messages');
      },
    });
  }

  private refreshPeerPresence(profileId: string | null | undefined): void {
    const id = (profileId || '').trim();
    if (!id) {
      this.watchedPeerId.set(null);
      this.isOtherOnline.set(false);
      return;
    }

    this.watchedPeerId.set(id);
    void this.chatSignalr.invoke('IsOnline', id);
  }

  private sameProfileId(a: string | null | undefined, b: string | null | undefined): boolean {
    const left = (a || '').trim().toLowerCase();
    const right = (b || '').trim().toLowerCase();
    return !!left && !!right && left === right;
  }

  private looksLikePlanPreview(text?: string | null, type?: string | null): boolean {
    const t = String(type || '').toLowerCase();
    if (t === 'milestoneplan' || t === '3') return true;
    return /^milestone plan\b/i.test((text || '').trim());
  }

  private normalizeIncomingMessage(raw: RoomMessage, fallbackRoomId: string): RoomMessage {
    const r = raw as RoomMessage & {
      PlanVersionId?: string | null;
      MessageType?: string;
      Text?: string | null;
      Id?: string;
      ChatRoomId?: string;
      SenderId?: string | null;
      SenderName?: string | null;
      CreatedAt?: string;
      IsMine?: boolean;
    };
    const planRaw = raw.planVersionId ?? r.PlanVersionId ?? null;
    return {
      ...raw,
      id: String(raw.id || r.Id || ''),
      chatRoomId: raw.chatRoomId || r.ChatRoomId || fallbackRoomId,
      senderId: raw.senderId ?? r.SenderId ?? null,
      senderName: raw.senderName ?? r.SenderName ?? null,
      messageType: String(raw.messageType || r.MessageType || 'Text'),
      text: raw.text ?? r.Text ?? null,
      planVersionId: planRaw == null || planRaw === '' ? null : String(planRaw),
      createdAt: raw.createdAt || r.CreatedAt || new Date().toISOString(),
      isMine: raw.isMine ?? r.IsMine ?? false,
      otherProfileId: raw.otherProfileId ?? null,
    };
  }

  private queueScrollToBottom(behavior: ScrollBehavior): void {
    if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = requestAnimationFrame(() => {
      this.scrollRaf = requestAnimationFrame(() => {
        this.scrollToBottom(behavior);
      });
    });
  }

  private scrollToBottom(behavior: ScrollBehavior): void {
    const el = this.messagesScroll()?.nativeElement;
    if (!el) return;
    if (!this.shouldStickToBottom && behavior !== 'auto') return;
    const top = el.scrollHeight;
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ top, behavior });
    } else {
      el.scrollTop = top;
    }
  }
}
