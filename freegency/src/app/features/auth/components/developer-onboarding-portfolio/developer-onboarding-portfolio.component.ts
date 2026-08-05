import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import { ImageUpload01Icon } from '@hugeicons/core-free-icons';
import { firstValueFrom } from 'rxjs';
import { DEVELOPER_ONBOARDING_PATH } from '../../../../core/auth/auth.models';
import { extractApiError } from '../../../../core/http/api-error';
import {
  CategoriesApiService,
  type CategoryDto,
} from '../../data-access/categories-api.service';
import { PortfolioApiService } from '../../data-access/portfolio-api.service';

const MAX_DESC = 2000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

@Component({
  selector: 'app-developer-onboarding-portfolio',
  imports: [FormsModule, HugeiconsIconComponent],
  templateUrl: './developer-onboarding-portfolio.component.html',
})
export class DeveloperOnboardingPortfolioComponent implements OnInit, OnDestroy {
  private readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('coverInput');
  private readonly router = inject(Router);
  private readonly portfolioApi = inject(PortfolioApiService);
  private readonly categoriesApi = inject(CategoriesApiService);

  protected readonly uploadIcon = ImageUpload01Icon as IconSvgObject;
  protected readonly descLimit = MAX_DESC;

  protected title = '';
  protected description = '';
  protected projectUrl = '';
  protected categoryId = '';

  protected readonly categories = signal<CategoryDto[]>([]);
  protected readonly previewUrl = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly uploadError = signal<string | null>(null);

  private coverFile: File | null = null;
  private objectUrl: string | null = null;

  protected get descCount(): number {
    return this.description.length;
  }

  ngOnInit(): void {
    this.categoriesApi.getCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: () => this.categories.set([]),
    });
  }

  ngOnDestroy(): void {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
  }

  protected openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.uploadError.set(null);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      this.uploadError.set('Please upload a JPEG, PNG, or WebP image.');
      input.value = '';
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      this.uploadError.set('Image must be 5MB or smaller.');
      input.value = '';
      return;
    }

    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.coverFile = file;
    this.objectUrl = URL.createObjectURL(file);
    this.previewUrl.set(this.objectUrl);
  }

  protected onDescInput(value: string): void {
    this.description = value.slice(0, MAX_DESC);
  }

  protected async onContinue(): Promise<void> {
    if (this.loading()) return;
    this.errorMessage.set(null);

    const trimmedTitle = this.title.trim();
    if (!trimmedTitle) {
      this.errorMessage.set('Project title is required to save a portfolio item.');
      return;
    }

    this.loading.set(true);
    try {
      await firstValueFrom(
        this.portfolioApi.createDeveloperPortfolio({
          title: trimmedTitle,
          description: this.description.trim() || null,
          projectUrl: this.projectUrl.trim() || null,
          categoryId: this.categoryId || null,
          images: this.coverFile ? [this.coverFile] : [],
        }),
      );
      await this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/complete`]);
    } catch (err) {
      this.loading.set(false);
      this.errorMessage.set(extractApiError(err, 'Could not save portfolio project.'));
    }
  }

  protected onSkip(): void {
    if (this.loading()) return;
    void this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/complete`]);
  }

  protected goBack(): void {
    void this.router.navigate([`${DEVELOPER_ONBOARDING_PATH}/skills`]);
  }
}
