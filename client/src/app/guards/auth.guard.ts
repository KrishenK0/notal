import { Inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { TokenService } from '../services/token.service';
import { DOCUMENT } from '@angular/common';
import { environment } from 'src/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

constructor(private token: TokenService, @Inject(DOCUMENT) private document: Document) { }
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.token.isLogged()) {
      window.location.href = environment.REDIRECT_URL;
      return false;
    }
    return true;
  }

}
