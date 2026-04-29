import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<cloudapp-alert></cloudapp-alert><router-outlet></router-outlet>',
  styles: `cloudapp-alert {
    top: 0;
    bottom: auto;
    position: relative;
  }`
})
export class AppComponent {

}
