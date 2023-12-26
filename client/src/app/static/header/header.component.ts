import { TokenService } from 'src/app/services/token.service';
import { InfoService } from './../../services/info.service';
import { DOCUMENT } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { environment } from 'src/environment';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public info: InfoService,
    public token: TokenService) {}

  login() {
    this.document.location.href = "https://www.notion.so/install-integration?response_type=code&client_id=f8844f66-125d-48b4-90ce-a2a091e945a0&redirect_uri=https%3A%2F%2Fnotal-esaip.vercel.app%2Flogin&owner=user";
  }

  toggleDropdown() {
    document.getElementById('dropdownInformation')?.classList.toggle('hidden');
  }
}
