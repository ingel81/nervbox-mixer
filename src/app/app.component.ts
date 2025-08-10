import { Component } from '@angular/core';
import { ShellComponent } from './shell/shell.component';

@Component({
    selector: 'app-root',
    imports: [ShellComponent],
    template: `<app-shell></app-shell>`
})
export class AppComponent {}
