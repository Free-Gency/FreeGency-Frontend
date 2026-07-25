import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { ClientViewNavbarComponent } from "../../shared/components/client-view-navbar/client-view-navbar.component";

@Component({
  selector: 'app-setting',
   standalone: true,
  imports: [ClientViewNavbarComponent, RouterOutlet, RouterLink, RouterLinkActive, ClientViewNavbarComponent],
  templateUrl: './setting.html',
  styleUrl: './setting.css',
})
export class Setting {

}
