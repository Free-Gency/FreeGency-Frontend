import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowRight01Icon,
  CheckmarkBadge01Icon,
  QuillWrite01Icon,
  SparklesIcon,
} from '@hugeicons/core-free-icons';
import { CLIENT_CREATE_PROJECT_PATH } from '../../../auth/utils/create-project-paths';

@Component({
  selector: 'app-client-create-project-choice',
  imports: [HugeiconsIconComponent],
  templateUrl: './client-create-project-choice.component.html',
  styleUrl: './client-create-project-choice.component.css',
  host: {
    class: 'flex w-full flex-1 flex-col',
  },
})
export class ClientCreateProjectChoiceComponent {
  private readonly router = inject(Router);

  protected readonly sparklesIcon = SparklesIcon as IconSvgObject;
  protected readonly quillIcon = QuillWrite01Icon as IconSvgObject;
  protected readonly arrowRightIcon = ArrowRight01Icon as IconSvgObject;
  protected readonly checkBadgeIcon = CheckmarkBadge01Icon as IconSvgObject;

  protected onGenerateWithAi(): void {
    void this.router.navigate([`${CLIENT_CREATE_PROJECT_PATH}/with-ai`]);
  }

  protected onWithoutAi(): void {
    void this.router.navigate([`${CLIENT_CREATE_PROJECT_PATH}/manual`]);
  }
}
