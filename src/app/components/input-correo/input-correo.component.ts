import { CommonModule } from '@angular/common';
import { Component, forwardRef, Input, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonIcon, IonInput } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { mailOutline } from 'ionicons/icons';
import { DOMINIO_INSTITUCIONAL, normalizarCorreo } from '../../constants/correo';

const LOCAL_PART_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;

@Component({
  selector: 'app-input-correo',
  standalone: true,
  imports: [CommonModule, FormsModule, IonIcon, IonInput],
  templateUrl: './input-correo.component.html',
  styleUrls: ['./input-correo.component.scss'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputCorreoComponent),
    multi: true
  }]
})
export class InputCorreoComponent implements ControlValueAccessor {
  private static nextId = 0;

  @Input() placeholder = 'Correo Institucional';
  @Input() ariaLabel = 'Correo institucional';
  @Input() describedBy: string | null = null;
  @Input() invalid = false;
  @Input() autocompletarDominio = false;
  @Input() validarAlSalir: ((correo: string) => void) | null = null;
  @ViewChild('emailInput') emailInput?: IonInput;

  readonly suggestionId = `correo-suggestion-${InputCorreoComponent.nextId++}`;
  value = '';
  suggestion: string | null = null;
  focused = false;
  disabled = false;
  private caretPosition = 0;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    addIcons({ mailOutline });
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
    this.updateSuggestion();
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
    const arrobas = this.value.match(/@/g)?.length ?? 0;
    if (this.autocompletarDominio && arrobas === 1 && this.value.endsWith('@')) {
      this.value = normalizarCorreo(`${this.value}${DOMINIO_INSTITUCIONAL}`);
      this.suggestion = null;
      this.onChange(this.value);
      this.placeCursorAtEnd();
      return;
    }
    this.caretPosition = this.value.length;
    this.onChange(this.value);
    this.updateSuggestion();
  }

  onFocus(): void {
    this.focused = true;
    this.caretPosition = this.value.length;
  }

  onBlur(): void {
    this.focused = false;
    this.onTouched();
    if (this.autocompletarDominio) {
      const previousValue = this.value;
      this.value = normalizarCorreo(this.value);
      if (this.value && !this.value.includes('@')) {
        this.value = `${this.value}@${DOMINIO_INSTITUCIONAL}`;
      }
      this.suggestion = null;
      if (this.value !== previousValue) this.onChange(this.value);
      this.validarAlSalir?.(this.value);
      return;
    }
    if (this.value && !this.value.includes('@') && this.hasValidLocalPart(this.value)) {
      this.completeWithoutRefocus();
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (!this.suggestion) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.completeAndFocus();
    } else if (event.key === 'Tab') {
      this.completeWithoutRefocus();
    } else if (event.key === 'ArrowRight') {
      if (this.caretPosition >= this.value.length) {
        event.preventDefault();
        this.completeAndFocus();
      } else {
        this.caretPosition += 1;
      }
    } else if (event.key === 'ArrowLeft') {
      this.caretPosition = Math.max(0, this.caretPosition - 1);
    } else if (event.key === 'Home') {
      this.caretPosition = 0;
    } else if (event.key === 'End') {
      this.caretPosition = this.value.length;
    }
  }

  async onPointerUp(event: PointerEvent): Promise<void> {
    const input = await this.emailInput?.getInputElement().catch((error: unknown) => {
      console.error('No se pudo determinar la posición del cursor del correo.', error);
      return undefined;
    });
    if (!input || !this.value) return;

    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const style = getComputedStyle(input);
    context.font = style.font;
    const textStart = input.getBoundingClientRect().left + (Number.parseFloat(style.paddingLeft) || 0) - input.scrollLeft;
    const offset = Math.max(0, event.clientX - textStart);
    let nearestDistance = Number.POSITIVE_INFINITY;
    this.caretPosition = this.value.length;
    for (let index = 0; index <= this.value.length; index += 1) {
      const width = context.measureText(this.value.slice(0, index)).width;
      const distance = Math.abs(width - offset);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        this.caretPosition = index;
      }
    }
  }

  holdInputFocus(event: PointerEvent): void {
    event.preventDefault();
  }

  selectSuggestion(): void {
    this.applySuggestion(true);
  }

  async focus(): Promise<void> {
    await this.emailInput?.setFocus();
  }

  private updateSuggestion(): void {
    this.suggestion = null;
    if (!this.value || /\s/.test(this.value)) return;

    const separator = this.value.indexOf('@');
    if (separator === -1) {
      if (this.hasValidLocalPart(this.value)) {
        this.suggestion = `${this.value}@${DOMINIO_INSTITUCIONAL}`;
      }
      return;
    }

    const localPart = this.value.slice(0, separator);
    const typedDomain = this.value.slice(separator + 1).toLowerCase();
    if (
      this.value.indexOf('@', separator + 1) === -1 &&
      this.hasValidLocalPart(localPart) &&
      typedDomain !== DOMINIO_INSTITUCIONAL &&
      DOMINIO_INSTITUCIONAL.startsWith(typedDomain)
    ) {
      this.suggestion = `${localPart}@${DOMINIO_INSTITUCIONAL}`;
    }
  }

  private hasValidLocalPart(localPart: string): boolean {
    return LOCAL_PART_PATTERN.test(localPart);
  }

  private completeAndFocus(): void {
    this.applySuggestion(true);
  }

  private completeWithoutRefocus(): void {
    this.applySuggestion(false);
  }

  private applySuggestion(refocus: boolean): void {
    if (!this.suggestion) return;
    this.value = this.suggestion;
    this.caretPosition = this.value.length;
    this.suggestion = null;
    this.onChange(this.value);

    requestAnimationFrame(() => {
      const inputElement = this.emailInput?.getInputElement();
      if (!inputElement) return;
      void inputElement.then((input) => {
        if (input.type !== 'email') {
          input.setSelectionRange(this.value.length, this.value.length);
        }
        if (refocus) input.focus({ preventScroll: true });
      }).catch((error: unknown) => {
        console.error('No se pudo colocar el cursor al final del correo.', error);
      });
    });
  }

  private placeCursorAtEnd(): void {
    requestAnimationFrame(() => {
      const inputElement = this.emailInput?.getInputElement();
      if (!inputElement) return;
      void inputElement.then((input) => {
        input.setSelectionRange(this.value.length, this.value.length);
      }).catch((error: unknown) => {
        console.error('No se pudo colocar el cursor al final del correo.', error);
      });
    });
  }
}
