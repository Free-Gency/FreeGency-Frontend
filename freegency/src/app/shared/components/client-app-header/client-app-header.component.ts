import { Component } from '@angular/core';
import { HugeiconsIconComponent, type IconSvgObject } from '@hugeicons/angular';
import {
  ArrowDown01Icon,
  Notification02Icon,
  Search01Icon,
} from '@hugeicons/core-free-icons';

@Component({
  selector: 'app-client-app-header',
  imports: [HugeiconsIconComponent],
  templateUrl: './client-app-header.component.html',
})
export class ClientAppHeaderComponent {
  protected readonly arrowDownIcon = ArrowDown01Icon as IconSvgObject;
  protected readonly searchIcon = Search01Icon as IconSvgObject;
  protected readonly notificationIcon = Notification02Icon as IconSvgObject;

  protected readonly navItems = [
    { label: 'Hire Talent', dropdown: true },
    { label: 'Manage Work', dropdown: false },
    { label: 'Reports', dropdown: true },
    { label: 'Messages', dropdown: false },
  ] as const;
}
