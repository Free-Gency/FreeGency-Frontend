import { Component, input } from '@angular/core';
import { PortfolioProjectDto } from '../../../model/portfolio.model';

@Component({
  selector: 'app-project-card',
  imports: [],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css',
})
export class ProjectCardComponent {
  project = input.required<PortfolioProjectDto>();
}
