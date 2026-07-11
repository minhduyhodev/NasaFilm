import { z } from 'zod';

export const comboFormSchema = z.object({
  name: z
    .string({ required_error: 'Tên combo không được để trống' })
    .trim()
    .min(1, 'Tên combo không được để trống')
    .max(120, 'Tên combo tối đa 120 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').optional().or(z.literal('')),
  price: z.coerce
    .number({
      required_error: 'Giá phải lớn hơn 0',
      invalid_type_error: 'Giá phải lớn hơn 0',
    })
    .positive('Giá phải lớn hơn 0'),
  imageUrl: z.string().optional().or(z.literal('')),
  isActive: z.boolean(),
});

export function firstComboFormError(error) {
  const issue = error?.issues?.[0];
  return issue?.message || 'Dữ liệu form không hợp lệ';
}
