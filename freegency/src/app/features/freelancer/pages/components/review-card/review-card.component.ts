import { Component, input } from '@angular/core';

@Component({
  selector: 'app-review-card',
  imports: [],
  templateUrl: './review-card.component.html',
  styleUrl: './review-card.component.css',
})
export class ReviewCardComponent {
  review = input.required<any>();

  getStarFontVariation(star: number): string {
    const isFilled = star <= this.review().rating;
    return isFilled ? "'FILL' 1" : "'FILL' 0";
  }
}
