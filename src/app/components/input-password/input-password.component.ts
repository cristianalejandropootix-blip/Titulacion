import { Component, forwardRef, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline } from 'ionicons/icons';

@Component({
  selector: 'app-input-password',
  standalone: true,
  imports: [IonIcon, IonInput],
  templateUrl: './input-password.component.html',
  styleUrls: ['./input-password.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputPasswordComponent),
    multi: true
  }]
})
export class InputPasswordComponent implements ControlValueAccessor {
  @Input() placeholder = 'Contraseña';
  @Input() autocomplete = 'current-password';
  @Input() ariaLabel = 'Contraseña';
  @Input() describedBy: string | null = null;
  @ViewChild('passwordInput') passwordInput?: IonInput;

  value = '';
  visible = false;
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  onInput(event: CustomEvent<{ value?: string | null }>): void {
    this.value = event.detail.value ?? '';
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }

  toggleVisibility(): void {
    this.visible = !this.visible;
  }

  hide(): void {
    this.visible = false;
  }

  async focusAndSelect(): Promise<void> {
    const input = await this.passwordInput?.getInputElement();
    if (!input) return;
    input.focus();
    input.select();
  }

  async focus(): Promise<void> {
    await this.passwordInput?.setFocus();
  }
}
