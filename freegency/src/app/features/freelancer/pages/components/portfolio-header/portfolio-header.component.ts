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

  displaySkills = computed(() => {
    const p = this.profile();
    if (!p.interests) return [];
    
    const allSkills = new Set<string>(); 
    
    p.interests.forEach(interest => {
      interest.specialties?.forEach(specialty => {
        specialty.skills?.forEach(skill => {
          allSkills.add(skill.name);
        });
      });
    });
    
    return Array.from(allSkills);
  });
}
