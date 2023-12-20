import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { CalendarService } from 'src/app/services/calendar.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent {
  alForm : FormGroup = this.formBuilder.group({
    username: '',
    password: '',
    parent: '',
  });
  
  parent = "";
  database = "";
  view = "";
  type = "";

  database$:Observable<any> = this.calendar.database.pipe(tap((v:any) => {
    if (v.result != false) {
      this.view = "success";
      this.calendar.databaseID = v.result;
    }
  }));
  allPages$:Observable<any> = this.calendar.allPages;

  constructor(private router: Router, public calendar: CalendarService, private formBuilder: FormBuilder) {}

  onSubmit() {
    this.calendar.synchronize({...this.alForm.value, parent_id:this.parent, type:this.type}).subscribe(res => {
      this.view = "success";
    });
  }

  changeView(v:string) {
    this.view = v;
  }

  changeType(v:string) {
    this.type = v;
    this.view = "alcuin";
  }
}
