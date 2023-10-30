import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TokenService } from 'src/app/services/token.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styles: [
  ]
})
export class LoginComponent implements OnInit {
  constructor(private route: ActivatedRoute, private tokenService: TokenService) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      this.tokenService.getToken(params['code']);
    })
  }
}
