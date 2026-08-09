import { Component, inject, Input, signal } from '@angular/core';
import { TeamProjectEarningsDto } from '../../../../../shared/models/TeamProjectEarningsDto';
import { PagedResponse } from '../../../../../shared/models/PagedResponse';
import { TeamsService } from '../../../data-access/teams.service';
import { CurrencyPipe } from '@angular/common';
import { WalletTeam } from '../../../../../shared/models/WalletTeam';
import { Wallet01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIconComponent } from '@hugeicons/angular';

@Component({
  selector: 'app-finance',
  imports: [ CurrencyPipe, HugeiconsIconComponent ],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.css',
})
export class FinanceComponent {
   @Input({ required: true })
  teamId!: string;

  private readonly teamsService = inject(TeamsService);
protected readonly walletIcon = Wallet01Icon;
  protected readonly projects =
    signal<TeamProjectEarningsDto[]>([]);
@Input() isTeamLeader = false;
  protected readonly pagination =
    signal<PagedResponse<TeamProjectEarningsDto> | null>(null);
protected readonly wallet = signal<WalletTeam | null>(null);
  protected readonly loading = signal(false);

  protected readonly error =
    signal<string | null>(null);

  protected readonly pageSize = 5;

  ngOnInit(): void {
    this.loadWallet();
    this.loadProjects(1);

  }

  private loadProjects(pageNumber: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.teamsService
      .getTeamProjectEarnings(this.teamId, {
        pageNumber,
        pageSize: this.pageSize,
        skipLoading: true,
      })
      .subscribe({
        next: (response) => {
         console.log( 'Team project earnings response:', response ); console.log( 'Project items:', response.items ); this.projects.set(response.items ?? []); this.pagination.set(response); console.log( 'Projects signal:', this.projects() ); console.log( 'Pagination signal:', this.pagination() );
          this.loading.set(false);
        },

        error: (err) => {
          this.projects.set([]);
          this.pagination.set(null);
          this.error.set(
            err?.message ?? 'Could not load finance data.',
          );
          this.loading.set(false);
        },
      });
  }

  protected changePage(page: number): void {
    const pagination = this.pagination();

    if (!pagination) {
      return;
    }

    if (page < 1 || page > pagination.totalPages) {
      return;
    }

    this.loadProjects(page);
  }

  protected previousPage(): void {
    const page = this.pagination()?.pageNumber ?? 1;

    this.changePage(page - 1);
  }

  protected nextPage(): void {
    const page = this.pagination()?.pageNumber ?? 1;

    this.changePage(page + 1);
  }
  protected readonly expandedProject = signal<string | null>(null);

protected toggleProject(projectId: string): void {
  this.expandedProject.update(current =>
    current === projectId ? null : projectId
  );
}
private loadWallet(): void {
  this.teamsService
    .getTeamWallet(this.teamId, {
      skipLoading: true,
    })
    .subscribe({
      next: (wallet) => {
        this.wallet.set(wallet);
      },
      error: (err) => {
        this.error.set(
          err?.message ?? 'Could not load wallet.',
        );
      },
    });
}

}
