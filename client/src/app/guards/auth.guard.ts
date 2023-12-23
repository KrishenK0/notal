import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

constructor(private token: TokenService, @Inject(DOCUMENT) private document: Document) { }
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.token.isLogged()) {
      window.location.href = 'https://www.notion.so/install-integration?response_type=code&client_id=f8844f66-125d-48b4-90ce-a2a091e945a0&redirect_uri=http%3A%2F%2Flocalhost:4200%2Flogin&owner=user';
      return false;
    }
    return true;
  }

}
