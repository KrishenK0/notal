import { Component } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  redirectURL = "https://www.notion.so/install-integration?response_type=code&client_id=f8844f66-125d-48b4-90ce-a2a091e945a0&redirect_uri=http%3A%2F%2Flocalhost:8080%2Ftoken&owner=user";
}
