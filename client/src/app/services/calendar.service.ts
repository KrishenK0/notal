import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { map } from 'rxjs/internal/operators/map';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {

  constructor(private http: HttpClient) { }

  week(login : {username: string, password: string}) {
    return this.http.post("http://localhost:8080/week", JSON.stringify(login)).subscribe(res => console.log);
  }
}
