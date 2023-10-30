import { Injectable } from '@angular/core';
import { TokenService } from './token.service';
import { environment } from 'src/environment';

@Injectable({
  providedIn: 'root'
})
export class InfoService {

  constructor(private tokenService: TokenService) { }

  public get user() : User {
    return JSON.parse(this.tokenService.decrypt(localStorage.getItem(environment.TOKEN_KEY) ?? ''));
  }

}

export declare class User {
  object: string;
  id: string;
  name: string;
  avatar_url: string;
  type: string;
  person: object;
}
