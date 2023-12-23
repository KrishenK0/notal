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
  });

  parent = "";
  database = "";
  view = "";
  type = "";

  private phrases: string[] = [
    "En attendant, profitez de cette pause pour prendre un café ! ☕",
    "Notion et Alcuin discutent de stratégies secrètes pour rendre votre journée encore plus fantastique. 🤔💼",
    "Votre Notion se synchronise avec Alcuin. 🗓️",
    "C'est le moment parfait pour planifier votre prochaine aventure pendant que Notion et Alcuin font connaissance. 🌍✈️",
    "Eh bien ! C'est que vous en avez des choses à faire cette semaine. 👀",
    "C'est le moment parfait pour élaborer votre stratégie secrète pour conquérir le monde du savoir ! 🌐🧠"
  ];

  public randomPhrase = this.phrases[Math.floor(Math.random() * this.phrases.length)];

  database$:Observable<any> = this.calendar.database.pipe(tap((v:any) => {
    if (v.result != false) {
      this.view = "type";
      this.parent = v.result;
    }
  }));
  allPages$:Observable<any> = this.calendar.allPages;

  constructor(private router: Router, public calendar: CalendarService, private formBuilder: FormBuilder) {}

  onSubmit() {
    this.view = "loading";
    this.displayRandomPhrase();
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

  displayRandomPhrase(): void {
    setInterval(() => {
      const randomIndex = Math.floor(Math.random() * this.phrases.length);
      this.randomPhrase = this.phrases[randomIndex];
    }, 5500); // Affiche une phrase toutes les 1,5 secondes
  }
}
