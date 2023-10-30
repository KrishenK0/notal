import { Component, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, NgForm } from '@angular/forms';
import { CalendarService } from 'src/app/services/calendar.service';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent {
  alForm : FormGroup = this.formBuilder.group({
    username: '',
    password: ''
  })

  constructor(private calendar: CalendarService, private formBuilder: FormBuilder) {}

  onSubmit() {
    this.calendar.week(this.alForm.value);
  }
}
