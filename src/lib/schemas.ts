import { z } from 'zod';

export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    captchaToken: z.string().optional(), // Make optional for now or strictly required if flow mandates
});

export const createMemberSchema = z.object({
    workspaceId: z.number().or(z.string().regex(/^\d+$/).transform(Number)),
    name: z.string().min(1, 'Name is required').max(100),
});

export const createExpenseSchema = z.object({
    sheetId: z.number().int(),
    payerId: z.number().int(),
    amount: z.number().positive('Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(200),
    type: z.enum(['SHARED', 'PRIVATE']),
    date: z.string().optional(),
    beneficiaryIds: z.array(z.number()).optional(),
});

export const updateExpenseSchema = z.object({
    amount: z.number().positive('Amount must be positive'),
    description: z.string().min(1, 'Description is required').max(200),
    type: z.enum(['SHARED', 'PRIVATE']),
    payerId: z.number().int(),
    beneficiaryIds: z.array(z.number()).optional(),
});

export const updateMemberSchema = z.object({
    name: z.string().min(1).max(100),
});

export const createSheetSchema = z.object({
    workspaceId: z.number().or(z.string().regex(/^\d+$/).transform(Number)),
    month: z.number().min(1).max(12).or(z.string().regex(/^\d+$/).transform(Number)),
    year: z.number().min(2000).max(2100).or(z.string().regex(/^\d+$/).transform(Number)),
});
