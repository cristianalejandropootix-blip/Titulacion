import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FasesPage } from './fases.page';

describe('FasesPage', () => {
  let component: FasesPage;
  let fixture: ComponentFixture<FasesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FasesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
