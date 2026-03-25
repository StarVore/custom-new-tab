import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BaseScreen } from './app/base-screen/base-screen';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BaseScreen],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('CustomNewTab');
}
