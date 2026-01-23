import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SheetSelector from './SheetSelector';
import React from 'react';

// Mock contexts
vi.mock('@/components/ui/ConfirmProvider', () => ({
    useConfirm: () => ({ confirm: vi.fn() })
}));

vi.mock('@/components/ui/ToastProvider', () => ({
    useToast: () => ({ addToast: vi.fn() })
}));

// Mock fetch
global.fetch = vi.fn();

describe('SheetSelector Unified Toolbar', () => {
    const mockSheets = [
        { id: 1, name: 'Tháng 1/2026', month: 1, year: 2026 }
    ];

    it('renders all toolbar actions within the unified container', () => {
        render(
            <SheetSelector
                sheets={mockSheets}
                currentSheetId={1}
                workspaceId={1}
                onChange={() => { }}
                onCreated={() => { }}
            />
        );

        // Check for Month Selector availability (by checking display value)
        expect(screen.getByText('Tháng 1/2026')).toBeDefined();

        // Check for Action Buttons by title
        expect(screen.getByTitle('Đổi tên')).toBeDefined();
        expect(screen.getByTitle('Xóa tháng này')).toBeDefined();
        expect(screen.getByTitle('Thùng rác')).toBeDefined();
        expect(screen.getByTitle('Thêm tháng mới')).toBeDefined();
    });

    it('renders Add button with correct icon in Unified Toolbar', () => {
        render(
            <SheetSelector
                sheets={mockSheets}
                currentSheetId={1}
                workspaceId={1}
                onChange={() => { }}
                onCreated={() => { }}
            />
        );

        // Ensure "Thêm tháng mới" button is present
        const addButton = screen.getByTitle('Thêm tháng mới');
        expect(addButton).toBeDefined();
        // Check if it has the specific class indicating it's the primary button inside the toolbar
        expect(addButton.className).toContain('bg-blue-600');
    });
});
