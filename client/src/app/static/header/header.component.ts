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
    this.document.location.href = environment.REDIRECT_URL;
  }

  toggleDropdown() {
    document.getElementById('dropdownInformation')?.classList.toggle('hidden');
  }
}
