import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ApiIcon,
  ArtificialIntelligence01Icon,
  Bug01Icon,
  CheckmarkCircle02Icon,
  CloudServerIcon,
  LaptopProgrammingIcon,
  MicrochipIcon,
  MobileProgramming01Icon,
  PenToolIcon,
  SecurityLockIcon,
  ShoppingCart01Icon,
  SourceCodeIcon,
} from '@hugeicons/core-free-icons';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { DEVELOPER_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import { CategoriesApiService } from '../../data-access/categories-api.service';
import { ProfileApiService } from '../../data-access/profile-api.service';

interface InterestCategory {
  id: string;
  label: string;
  icon: IconSvgObject;
}

const ICON_RULES: { match: string; icon: IconSvgObject }[] = [
  { match: 'ui', icon: PenToolIcon as IconSvgObject },
  { match: 'ux', icon: PenToolIcon as IconSvgObject },
  { match: 'web', icon: LaptopProgrammingIcon as IconSvgObject },
  { match: 'mobile', icon: MobileProgramming01Icon as IconSvgObject },
  { match: 'saas', icon: MicrochipIcon as IconSvgObject },
  { match: 'custom software', icon: MicrochipIcon as IconSvgObject },
  { match: 'backend', icon: ApiIcon as IconSvgObject },
  { match: 'devops', icon: CloudServerIcon as IconSvgObject },
  { match: 'cloud', icon: CloudServerIcon as IconSvgObject },
  { match: 'qa', icon: Bug01Icon as IconSvgObject },
  { match: 'test', icon: Bug01Icon as IconSvgObject },
  { match: 'ai', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'data', icon: ArtificialIntelligence01Icon as IconSvgObject },
  { match: 'security', icon: SecurityLockIcon as IconSvgObject },
  { match: 'cyber', icon: SecurityLockIcon as IconSvgObject },
  { match: 'commerce', icon: ShoppingCart01Icon as IconSvgObject },
];

function iconFor(name: string): IconSvgObject {
  const key = name.toLowerCase();
  return (
    ICON_RULES.find((rule) => key.includes(rule.match))?.icon ?? (SourceCodeIcon as IconSvgObject)
  );
}

@Component({
  selector: 'app-developer-onboarding-expertise',
  imports: [HugeiconsIconComponent],
  templateUrl: './developer-onboarding-expertise.component.html',
  styleUrl: './developer-onboarding-expertise.component.css',
})
export class DeveloperOnboardingExpertiseComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly profileApi = inject(ProfileApiService);
  private readonly categoriesApi = inject(CategoriesApiService);

  protected readonly categories = signal<InterestCategory[]>([]);
  protected readonly selectedIds = signal<string[]>([]);
  protected readonly loading = signal(false);
  protected readonly loadingCategories = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly checkIcon = CheckmarkCircle02Icon as IconSvgObject;

  ngOnInit(): void {
    this.load();
  }

  protected isSelected(id: string): boolean {
    return this.selectedIds().includes(id);
  }

  protected toggle(id: string): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  protected onContinue(): void {
    void this.submit(true);
  }

  protected onSkip(): void {
    void this.submit(false);
  }

  private load(): void {
    this.loadingCategories.set(true);
    this.errorMessage.set(null);

    forkJoin({
      categories: this.categoriesApi.getCategories(),
      profile: this.profileApi.getDeveloperProfile().pipe(catchError(() => of(null))),
    }).subscribe({
      next: ({ categories, profile }) => {
        this.categories.set(
          categories.map((c) => ({
            id: c.id,
            label: c.nameEn || c.name,
            icon: iconFor(c.nameEn || c.name),
          })),
        );
        const interests = profile?.interests ?? [];
        this.selectedIds.set(interests.map((i) => i.id).filter(Boolean));
        this.loadingCategories.set(false);
      },
      error: (err) => {
        this.loadingCategories.set(false);
        this.errorMessage.set(extractApiError(err, 'Failed to load categories.'));
      },
    });
  }

  private async submit(saveInterests: boolean): Promise<void> {
    if (this.loading()) return;

    this.errorMessage.set(null);
    this.loading.set(true);

    try {
      if (saveInterests) {
        await firstValueFrom(this.profileApi.replaceDeveloperInterests(this.selectedIds()));
      }
      await this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/skills`]);
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(extractApiError(err));
    }
  }
}
