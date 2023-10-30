import { environment } from './../../environment';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import  *  as CryptoJS from  'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class TokenService {

  constructor(private http: HttpClient, private router: Router) { }

  getToken(token: string) {
    return this.http.get(`http://127.0.0.1:8080/auth?code=${token}`, )
    .subscribe({
      next: (data: any) => {
        localStorage.setItem(environment.TOKEN_KEY, this.encrypt(JSON.stringify(data['owner']['user'])));
        localStorage.setItem(environment.AUTHID_KEY, this.encrypt(data['access_token']));
        this.router.navigateByUrl('/');
      },
      error: (e) => this.router.navigateByUrl('/')
    });
  }

  logout() {
    localStorage.removeItem(environment.TOKEN_KEY);
    localStorage.removeItem(environment.AUTHID_KEY);
  }

  public encrypt(txt: string): string {
    return CryptoJS.AES.encrypt(txt, environment.encryptKey).toString();
  }

  public decrypt(txtToDecrypt: string) {
    return CryptoJS.AES.decrypt(txtToDecrypt, environment.encryptKey).toString(CryptoJS.enc.Utf8);
  }
}
