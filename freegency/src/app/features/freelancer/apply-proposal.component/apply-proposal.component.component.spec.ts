import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplyProposalModalComponent } from './apply-proposal.component.component';

describe('ApplyProposalComponentComponent', () => {
  let component: ApplyProposalModalComponent;
  let fixture: ComponentFixture<ApplyProposalModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApplyProposalModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ApplyProposalModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
