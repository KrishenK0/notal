import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from './../../environment';
import { Router } from '@angular/router';
import  *  as CryptoJS from  'crypto-js';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  constructor(private http: HttpClient, private cookieService: CookieService, private router: Router) { }

  getToken(token: string) {
    return this.http.get(`https://notal.onrender.com/auth?code=${token}`, )
    .subscribe({
      next: (data: any) => {
        localStorage.setItem(environment.TOKEN_KEY, this.encrypt(JSON.stringify(data['owner']['user'])));
        this.cookieService.set(environment.AUTHID_KEY, data['access_token']);
        this.router.navigateByUrl('/');
      },
      error: (e: any) => this.router.navigateByUrl('/')
    });
  }

  getAuthToken() {
    return this.cookieService.get(environment.AUTHID_KEY);
  }

  isLogged() {
    return localStorage.getItem(environment.TOKEN_KEY) != undefined && localStorage.getItem(environment.TOKEN_KEY) != "";
  }

  logout() {
    localStorage.removeItem(environment.TOKEN_KEY);
    this.cookieService.deleteAll();
  }

  public encrypt(txt: string): string {
    return CryptoJS.AES.encrypt(txt, environment.encryptKey).toString();
  }

  public decrypt(txtToDecrypt: string) {
    return CryptoJS.AES.decrypt(txtToDecrypt, environment.encryptKey).toString(CryptoJS.enc.Utf8);
  }
}
