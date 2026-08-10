import { Component, input } from '@angular/core';
import { PortfolioReviewDto } from '../../../model/portfolio.model';

@Component({
  selector: 'app-review-card',
  standalone: true,
  imports: [],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.css',
})
export class ReviewCardComponent {
  review = input.required<PortfolioReviewDto>();

  getStarFontVariation(star: number): string {
    const isFilled = star <= Number(this.review().rating ?? 0);
    return isFilled ? "'FILL' 1" : "'FILL' 0";
  }
}
