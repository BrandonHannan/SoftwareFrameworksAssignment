import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { FormsModule } from '@angular/forms';
import { Login } from './login.component';
import { AuthenticationService } from '../services/auth.service';
import { Router } from '@angular/router';

describe('LoginComponent', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: jasmine.SpyObj<AuthenticationService>;
  let router: Router;

  beforeEach(async () => {
    const authServiceSpy = jasmine.createSpyObj('AuthenticationService', ['login']);

    await TestBed.configureTestingModule({
      imports: [
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule.withRoutes([]),
        Login
      ],
      providers: [
        { provide: AuthenticationService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthenticationService) as jasmine.SpyObj<AuthenticationService>;
    router = TestBed.inject(Router);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call authService.login and navigate on successful login', async () => {
    const navigateSpy = spyOn(router, 'navigateByUrl');
    authService.login.and.resolveTo({ valid: true, error: '' });
    component.username = 'test';
    component.password = 'pass';

    await component.checkLogin();

    expect(authService.login).toHaveBeenCalledWith({ username: 'test', password: 'pass' });
    expect(navigateSpy).toHaveBeenCalledWith('/account');
  });

  it('should set error message on failed login', async () => {
    authService.login.and.resolveTo({ valid: false, error: 'Invalid credentials' });
    component.username = 'test';
    component.password = 'wrong';

    await component.checkLogin();

    expect(component.errorMessage).toBe('Invalid credentials');
  });
});