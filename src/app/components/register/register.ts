import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, OnInit, Output, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Route, Router } from '@angular/router';
import { RegisterService } from './register.service';
import { CommonModule } from '@angular/common';
import { RoutesService } from '../../services/routes-services/routes.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpEventType } from '@angular/common/http';
import {  NgbModal, NgbModalModule, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { RecaptchaModule } from 'ng-recaptcha';
import { AppConstants } from '../../class/app-constants/app-constants';

interface UploadFile {
  file: File;
  preview?: string;
  progress: number;
  icon?: string;
}

interface ExistingImage {
  url: string;
  name: string;
  isExisting: true;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,  
    RecaptchaModule,
    NgbModalModule,
    NgbModule
  ],
  templateUrl: './register.html',
  styleUrls: ['./register.scss']
})
export class Register implements OnInit, AfterViewInit {

  isCaptchaLoading = true;
  ngAfterViewInit(): void {
    // Preload reCAPTCHA by accessing it early in the lifecycle.
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // reCAPTCHA script has loaded, hide the spinner
      // console.log('reCAPTCHA script has loaded');
      this.isCaptchaLoading = false;
    };
    document.body.appendChild(script);
  }

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private registerService: RegisterService,
    private routesService: RoutesService,
    private modalService: NgbModal
  ) { }

  registerForm: any;
  loading = false;
  fileError = '';

  files: UploadFile[] = [];
  existingImages: ExistingImage[] = [];
  isExistingUser = false;
  selectedImage: string | null = null;
  private appConstants = AppConstants;
  captchaResponse: string | null = null;
  reCaptchaKey = this.appConstants.siteKey;
  errorMessage: string = '';

  showCaptchaModal: boolean = false;
  @Output() closeModalEvent = new EventEmitter<{ classname?: any }>();
  @ViewChild('reCaptchaModal', { static: true }) reCaptchaModal!: ElementRef;

  ngOnInit(): void {
    this.initForm();

    this.registerForm.get('phoneNumber')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe((value: string) => {

        if (!value || value.length < 10) {
          return;
        }

        this.loadByPhone(value);
      });
  }

  get f() {
    return this.registerForm.controls;
  }

  initForm() {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      email: [''],
      address: ['', Validators.required],
      projectLocation: ['', Validators.required],
      projectMeasurement: ['', Validators.required],
      problem: ['', Validators.required],
      comments: [''],
      projectImages: [[]]
    });
  }

  // ================= LOAD DATA =================
  loadByPhone(phone: string) {
    this.registerService.getByPhone(phone).subscribe(res => {

      const data = res?.data?.data;
      this.isExistingUser = res?.data?.isExisting;

      if (this.isExistingUser && data) {

        //  PATCH FORM
        this.registerForm.patchValue({
          name: data.name,
          phoneNumber: data.phoneNumber,
          email: data.email,
          address: data.address,
          projectLocation: data.projectLocation,
          projectMeasurement: data.projectMeasurement,
          problem: data.problem,
          comments: data.comments
        });

        //  LOAD IMAGES
        this.existingImages = (data.imageUrls || []).map((path: string) => ({
          url: this.convertToViewUrl(path),
          name: this.getFileName(path),
          isExisting: true
        }));

      } else {
        //  IMPORTANT: RESET FORM EXCEPT PHONE
        const phoneValue = this.registerForm.get('phoneNumber')?.value;

        this.registerForm.reset();
        this.resetAllState();

        // keep phone number
        this.registerForm.patchValue({
          phoneNumber: phoneValue
        });

        this.isExistingUser = false;
      }
    });
  }

  convertToViewUrl(path: string): string {
    if (!path) return '';

    const fileName = path.split('\\').pop(); // Windows path fix

    return `${this.routesService.imageRoot}/${fileName}`;
  }

  isImage(file: string): boolean {
    return /\.(png|jpg|jpeg|webp)$/i.test(file);
  }

  isPdf(file: string): boolean {
    return /\.pdf$/i.test(file);
  }

  getFileName(path: string): string {
    return path.split('\\').pop() || '';
  }

  // ================= FILE UPLOAD =================

  private allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/jfif',
    'image/heic'
  ];

  onFileSelect(event: any) {
    const selectedFiles = Array.from(event.target.files) as File[];

    this.processFiles(selectedFiles);

    event.target.value = '';
  }

  onDragOver(event: any) {
    event.preventDefault();
  }

  onDragLeave(event: any) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();

    if (!event.dataTransfer?.files) return;

    const files = Array.from(event.dataTransfer.files);
    this.processFiles(files);
  }

  processFiles(files: File[]) {
    this.fileError = '';

    const newFiles: UploadFile[] = [];

    files.forEach(file => {

      // VALIDATION
      if (!this.allowedTypes.includes(file.type)) {
        this.showToast(
          `${file.name} is not allowed. Only jpg, jpeg, png, jfif, webp, heic`,
          'error'
        );
        return;
      }

      const uploadFile: UploadFile = {
        file,
        progress: 0
      };

      // ✅ INSTANT PREVIEW (NO FileReader)
      if (file.type.startsWith('image')) {
        uploadFile.preview = URL.createObjectURL(file);
      } else {
        uploadFile.icon = this.getFileIcon(file.name);
      }

      newFiles.push(uploadFile);
    });

    // ✅ ONE UPDATE → INSTANT UI
    this.files = [...this.files, ...newFiles];

    this.updateForm();
  }

  resetAllState() {
    this.existingImages = [];
    this.files = [];
    this.selectedImage = null;
  }

  removeFile(index: number) {
    const file = this.files[index];

    if (file.preview) {
      URL.revokeObjectURL(file.preview); // cleanup
    }

    this.files.splice(index, 1);
    this.files = [...this.files]; // trigger UI
    this.updateForm();
  }

  removeExistingImage(index: number) {
    this.existingImages.splice(index, 1);
  }

  updateForm() {
    const fileList = this.files.map(f => f.file);
    this.registerForm.patchValue({
      projectImages: fileList
    });
  }

  openPreview(url: string) {
    this.selectedImage = url;
  }

  closePreview() {
    this.selectedImage = null;
  }

  getFileIcon(name: string): string {
    const ext = name.split('.').pop()?.toLowerCase();

    switch (ext) {
      case 'pdf': return '📕 PDF';
      case 'doc':
      case 'docx': return '📘 Word';
      case 'xls':
      case 'xlsx': return '📗 Excel';
      case 'zip': return '🗜️ ZIP';
      default: return '📄 File';
    }
  }

  showToast(message: string, type: 'success' | 'error') {
    const toastEl = document.createElement('div');

    toastEl.className = `toast align-items-center text-white ${type === 'success' ? 'bg-success' : 'bg-danger'} border-0`;
    toastEl.role = 'alert';
    toastEl.style.position = 'fixed';
    toastEl.style.top = '20px';
    toastEl.style.right = '20px';
    toastEl.style.zIndex = '9999';

    toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto"></button>
    </div>
  `;

    document.body.appendChild(toastEl);

    const toast = new (window as any).bootstrap.Toast(toastEl, {
      delay: 3000
    });

    toast.show();

    // remove after hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
      toastEl.remove();
    });
  }

  openModal() {
    //this.modalService.open(this.reCaptchaModal, { size: 'md', centered: true });
    const modalRef = this.modalService.open(this.reCaptchaModal, {
      size: 'md',
      centered: true,
    });

    modalRef.result
      .then(() => {
        // console.log('Modal closed');
      })
      .catch((error) => {
        // console.log('Modal dismissed', error);
      });

    // Manually trigger loading the reCAPTCHA when the modal is opened
    setTimeout(() => {
      this.isCaptchaLoading = false; // Show reCAPTCHA after modal is loaded
    }, 0);
  }


  // ================= SUBMIT =================
  apiMessage: string = '';
  messageType: string = '';


  async onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.showToast('Please fill all required fields', 'error');
      return;
    }

    this.loading = true;

    try {
      const formData = new FormData();

      const formValue = {
        ...this.registerForm.value,
        recaptcha: this.captchaResponse
      };

      formData.append('name', formValue.name);
      formData.append('phoneNumber', formValue.phoneNumber);
      formData.append('address', formValue.address);
      formData.append('email', formValue.email || '');
      formData.append('projectLocation', formValue.projectLocation);
      formData.append('projectMeasurement', formValue.projectMeasurement);
      formData.append('problem', formValue.problem);
      formData.append('comments', formValue.comments || '');
      formData.append('recaptcha', formValue.recaptcha || '');

      // =========================
      // MERGE FILES
      // =========================
      const allFiles: File[] = [];

      // NEW files
      this.files.forEach(f => allFiles.push(f.file));

      // EXISTING images -> convert to File
      const existingFiles = await Promise.all(
        this.existingImages.map(async (img) => {
          const response = await fetch(img.url);
          const blob = await response.blob();
          return new File([blob], img.name || 'existing.jpg', { type: blob.type });
        })
      );

      allFiles.push(...existingFiles);

      // append files
      allFiles.forEach(file => {
        formData.append('projectImages', file);
      });

      // =========================
      // API CALL
      // =========================
      this.registerService.submitForm(formData).subscribe({
        next: (res: any) => {

          this.loading = false;
          this.captchaResponse = null;

          // =========================
          // SUCCESS
          // =========================
          if (res?.success) {

            this.showToast(res.message || 'Saved successfully!', 'success');

            this.resetFormState();

          }
          // =========================
          // BUSINESS ERROR
          // =========================
          else {
            this.showToast(res?.message || 'Validation failed!', 'error');
          }
        },

        error: (err) => {
          this.loading = false;
          this.captchaResponse = null;

          if (typeof grecaptcha !== 'undefined') {
            grecaptcha.reset();
          }

          this.showToast(
            err?.error?.message || 'Server error. Please try again.',
            'error'
          );
        }
      });

    } catch (error) {
      this.loading = false;
      this.showToast('Unexpected error occurred', 'error');
    }
  }


  closeModal(classname?: any) {
    this.modalService.dismissAll(this.reCaptchaModal);
  }

  onCaptchaLoad() {
    this.isCaptchaLoading = false; // Hide spinner when reCAPTCHA is fully loaded
  }

  onCaptchaResolved(response: string | null) {
    this.captchaResponse = response;
    setTimeout(() => {
      this.closeModal();
      // this.sendFormData();
    }, 3000);
  }
  errorCheck() {
    // Mark all fields as touched so error messages show up
    Object.keys(this.registerForm.controls).forEach((field) => {
      const control = this.registerForm.get(field);
      control?.markAsTouched();
    });
  }

  // onSubmit() {
  //   this.errorMessage = '';
  //   this.errorCheck();
  //   if (this.registerForm.valid) {
  //     this.openModal();
  //   }
  // }

  resetFormState() {
    this.registerForm.reset();
    this.files = [];
    this.existingImages = [];
    this.selectedImage = null;
    this.captchaResponse = null;

    if (typeof grecaptcha !== 'undefined') {
      grecaptcha.reset();
    }
  }


  isFocused: any = {};

  onFocus(field: string) {
    this.isFocused[field] = true;
  }

  onBlur(field: string) {
    this.isFocused[field] = false;
  }
}

