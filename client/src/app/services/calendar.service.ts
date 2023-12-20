import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs';
import { map } from 'rxjs/internal/operators/map';

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type':  'application/x-www-form-urlencoded'
    }),
    withCredentials: true,
  };    

  constructor(private http: HttpClient) { }

  week(login : {username: string, password: string}) {

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type':  'application/x-www-form-urlencoded'
      })
    };    

    let formData = new HttpParams({
      fromObject: login
    });


    return this.http.post("http://localhost:8080/week", formData, httpOptions).subscribe(res => console.log);
  }
}
