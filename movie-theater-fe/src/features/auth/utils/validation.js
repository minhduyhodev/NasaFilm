import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, 'Họ và tên không được để trống')
      .min(2, 'Họ và tên phải có ít nhất 2 ký tự'),
    email: z
      .string()
      .min(1, 'Email không được để trống')
      .email('Email không đúng định dạng'),
    phoneNumber: z
      .string()
      .optional()
      .or(z.literal(''))
      .refine(
        (val) => !val || /^(0[35789][0-9]{8})$/.test(val),
        'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 03, 05, 07, 08 hoặc 09'
      ),
    dayOfBirth: z
      .string()
      .min(1, 'Ngày sinh không được để trống')
      .refine((val) => {
        const birthDate = new Date(val);
        const today = new Date();
        return birthDate < today;
      }, 'Ngày sinh phải ở quá khứ')
      .refine((val) => {
        const birthDate = new Date(val);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        return age >= 12;
      }, 'Bạn phải từ 12 tuổi trở lên để đăng ký tài khoản'),
    gender: z
      .string()
      .min(1, 'Vui lòng chọn giới tính')
      .refine((val) => ['MALE', 'FEMALE', 'OTHER'].includes(val), 'Giới tính không hợp lệ'),
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái viết thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .regex(/[!@#$%^&*]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*)'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    agreeToTerms: z.boolean().refine((val) => val === true, {
      message: 'Bạn phải đồng ý với Điều khoản dịch vụ và Chính sách bảo mật',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Password is required')
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });





