import React, { useEffect, useState } from 'react';

interface Log {
    id: number;
    description: string;
    actorName: string;
    action: string;
    createdAt: string;
}

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ActivityLogList() {
    const [isOpen, setIsOpen] = useState(false); // Default CLOSED to save space
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && logs.length === 0) {
            fetchLogs();
        }
    }, [isOpen]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/activity-logs');
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'text-green-600 bg-green-50 border-green-200';
            case 'UPDATE': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200';
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'CREATE': return 'Tạo mới';
            case 'UPDATE': return 'Cập nhật';
            case 'DELETE': return 'Xóa';
            default: return 'Hoạt động';
        }
    };

    return (
        <Card className="w-full shadow-md hover:shadow-lg transition-all duration-300 border-t-4 border-t-purple-500 bg-white group/card">
            <CardHeader
                className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex flex-row items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
            >
                <CardTitle className="text-base flex items-center gap-2 text-purple-700">
                    <History className="w-5 h-5 text-purple-500" />
                    Nhật Ký Hoạt Động
                </CardTitle>
                <div className={cn("transition-transform duration-300 text-slate-400", isOpen && "rotate-180")}>
                    <ChevronDown className="w-5 h-5" />
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="p-0 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="h-[350px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {loading ? (
                            <div className="flex justify-center p-4 text-slate-400 font-medium italic">Đang tải dữ liệu...</div>
                        ) : logs.length === 0 ? (
                            <div className="text-center p-4 text-slate-400 italic">Chưa có hoạt động nào được ghi lại.</div>
                        ) : (
                            logs.map(log => (
                                <div
                                    key={log.id}
                                    className="p-3 rounded-lg border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col gap-1.5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider", getActionColor(log.action))}>
                                                {getActionLabel(log.action)}
                                            </span>
                                            <span className="font-semibold text-sm text-slate-800">{log.actorName}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 pl-1 leading-relaxed">
                                        {log.description}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            )}
        </Card>
    );
}
