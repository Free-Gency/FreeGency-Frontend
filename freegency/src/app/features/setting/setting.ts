import { Component } from '@angular/core';
import { ClientAppHeaderComponent } from "../../shared/components/client-app-header/client-app-header.component";
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-setting',
   standalone: true,
  imports: [ClientAppHeaderComponent, RouterOutlet,RouterLink,RouterLinkActive],
  templateUrl: './setting.html',
  styleUrl: './setting.css',
})
export class Setting {

}
