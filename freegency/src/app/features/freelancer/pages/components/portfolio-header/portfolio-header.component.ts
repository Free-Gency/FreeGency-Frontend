import { Component, computed, input } from '@angular/core';
import { DeveloperProfile, SocialLinkDto } from '../../../model/portfolio.model';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-portfolio-header',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './portfolio-header.component.html',
  styleUrl: './portfolio-header.component.css',
})
export class PortfolioHeaderComponent {

  profile = input.required<DeveloperProfile>();
  socialLinks = input<SocialLinkDto[]>([]);
  /** When false, hide owner-only actions (public / client view). */
  canEdit = input(true);
  /** Optional override from loaded portfolio projects when API totalJobs is missing. */
  projectsCount = input(0);

  displayCategories = computed(() => {
    const p = this.profile();
    if (!p.interests?.length) return [];

    const names = new Set<string>();
    for (const interest of p.interests) {
      const label = (interest.nameEn || interest.name || '').trim();
      if (label) names.add(label);
    }
    return Array.from(names);
  });

  displaySpecialties = computed(() => {
    const p = this.profile();
    if (!p.interests?.length) return [];

    const names = new Set<string>();
    for (const interest of p.interests) {
      for (const specialty of interest.specialties ?? []) {
        const label = (specialty.nameEn || specialty.nameAr || '').trim();
        if (label) names.add(label);
      }
    }
    return Array.from(names);
  });

  displaySkills = computed(() => {
    const p = this.profile();
    if (!p.interests) return [];

    const allSkills = new Set<string>();

    p.interests.forEach((interest) => {
      interest.specialties?.forEach((specialty) => {
        specialty.skills?.forEach((skill) => {
          if (skill.name?.trim()) allSkills.add(skill.name.trim());
        });
      });
    });

    return Array.from(allSkills);
  });

  jobSuccessRate = computed(() => {
    const p = this.profile();
    if (p.jobSuccessRate != null && p.jobSuccessRate > 0) return Math.round(p.jobSuccessRate);
    const rating = Number(p.averageRating ?? 0);
    if (rating <= 0) return 0;
    return Math.round(Math.min(5, Math.max(0, rating)) / 5 * 100);
  });

  totalJobs = computed(() => {
    const fromApi = Number(this.profile().totalJobs ?? 0);
    if (fromApi > 0) return fromApi;
    return this.projectsCount();
  });
}
