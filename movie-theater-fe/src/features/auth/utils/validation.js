import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không đúng định dạng'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
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
        'Định dạng số điện thoại không hợp lệ. Hệ thống chỉ hỗ trợ các đầu số di động hiện hành tại Việt Nam.'
      ),
    dayOfBirth: z
      .string()
      .min(1, 'Ngày sinh không được để trống')
      .refine((val) => {
        const birthDate = new Date(val);
        const today = new Date();
        return birthDate < today;
      }, 'Ngày sinh không hợp lệ. Bạn không thể chọn ngày sinh ở tương lai.')
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
    .min(1, 'Email không được để trống')
    .email('Email không đúng định dạng'),
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái viết thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .regex(/[!@#$%^&*]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*)'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không trùng khớp',
    path: ['confirmPassword'],
  });

export const activateAccountSchema = z
  .object({
    temporaryPassword: z
      .string()
      .min(1, 'Vui lòng nhập mật khẩu tạm thời từ email'),
    password: z
      .string()
      .min(1, 'Mật khẩu không được để trống')
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất một chữ cái viết hoa')
      .regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất một chữ cái viết thường')
      .regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất một chữ số')
      .regex(/[!@#$%^&*]/, 'Mật khẩu phải chứa ít nhất một ký tự đặc biệt (!@#$%^&*)'),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Mật khẩu không trùng khớp',
    path: ['confirmPassword'],
  });

