import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ClientViewNavbarComponent } from '../../../../shared/components/client-view-navbar/client-view-navbar.component';

@Component({
  selector: 'app-client-create-project-layout',
  imports: [ClientViewNavbarComponent, RouterOutlet],
  template: `
    <div class="flex min-h-dvh flex-col bg-background">
      <app-client-view-navbar class="relative z-30 w-full overflow-visible" />
      <main class="relative z-10 mx-auto flex w-full flex-1 flex-col items-center">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ClientCreateProjectLayoutComponent {}
