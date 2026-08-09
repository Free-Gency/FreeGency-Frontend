import { Component, computed, input } from '@angular/core';
import { DeveloperProfile, PortfolioProjectDto } from '../../../model/portfolio.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-strength',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-strength.component.html',
})
export class ProfileStrengthComponent {
  profile = input.required<DeveloperProfile>();
  projects = input<PortfolioProjectDto[]>([]);

  // Calculate the individual steps based on your snippet's logic
  steps = computed(() => {
    const p = this.profile();
    const proj = this.projects();

    return [
      {
        label: 'Upload avatar',
        isComplete: !!p.profileImage
      },
      {
        label: 'Add bio summary',
        isComplete: !!(p.bio && p.bio.trim().length > 0)
      },
      {
        label: 'Upload portfolio items',
        isComplete: Array.isArray(proj) && proj.length > 0
      }
    ];
  });

  // Calculate the total score
  completionScore = computed(() => {
    const completedCount = this.steps().filter(s => s.isComplete).length;
    let score = completedCount * 33.33;
    if (score == 99.99 || score == 100) score = 100; 
    return score; 
  });
}