import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { first } from "rxjs/internal/operators/first";
import { map } from "rxjs/internal/operators/map";
import { tap } from "rxjs/internal/operators/tap";


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


  private _databaseID!: string;

  constructor(private http: HttpClient) { }

  synchronize(payload : any) {
    let formData = new HttpParams({
      fromObject: payload
    });
    return this.http.post("http://localhost:8080/synchronize", formData, this.httpOptions);
  }

  public get database() {
    return this.http.get("http://localhost:8080/api/database", this.httpOptions);
  }

  public set databaseID(v: any) {
    this._databaseID = v;
  }

  public get databaseID() {
    if (this._databaseID === undefined) {
      let sub = this.database.pipe(first(), tap((v:any) => {
        if (v.result != false) {
          this.databaseID = v.result;
        }
      })).subscribe((data:any) => sub.unsubscribe());
    }
    return this._databaseID;
  }

  public get allPages() {
    return this.http.get("http://localhost:8080/api/allPages", this.httpOptions).pipe(map(response=>response));
  }
}
