import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Redirects Angular routes to static HTML demos under /public/demo. */
@Component({
  selector: 'app-static-demo-redirect',
  standalone: true,
  template: `
    <div class="min-h-[40vh] flex items-center justify-center p-8 text-sm text-on-surface-variant">
      Opening demo…
    </div>
  `,
})
export class StaticDemoRedirect implements OnInit {
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    const file =
      this.route.snapshot.data['demoFile'] ?? 'proposal-milestone-flow.html';
    window.location.replace(`/demo/${file}`);
  }
}
