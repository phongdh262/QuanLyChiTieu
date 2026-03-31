import React, { useState } from 'react';
import { Member } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import useSWR from 'swr';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Log {
    id: number;
    description: string;
    actorName: string;
    action: string;
    createdAt: string;
}

interface Props {
    members: Member[];
    month?: number;
    year?: number;
    sheetId?: number;
    sheetName?: string;
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ActivityLogList({ members, month, year, sheetId, sheetName }: Props) {
    const [isOpen, setIsOpen] = useState(true); // Default OPEN for drawer mode
    const [selectedUser, setSelectedUser] = useState<string>('all');

    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    if (sheetId) params.append('sheetId', sheetId.toString());

    const queryString = params.toString() ? `?${params.toString()}` : '';

    const { data: logs = [], isLoading } = useSWR<Log[]>(
        isOpen ? `/api/activity-logs${queryString}` : null,
        fetcher,
        {
            refreshInterval: 10000, // Poll every 10 seconds
            revalidateOnFocus: true,
            dedupingInterval: 2000
        }
    );

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE': return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-300 dark:bg-blue-500/15 dark:border-blue-500/30';
            case 'UPDATE': return 'text-cyan-700 bg-cyan-50 border-cyan-200 dark:text-cyan-300 dark:bg-cyan-500/15 dark:border-cyan-500/30';
            case 'DELETE': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-white/[0.03] dark:border-white/[0.08]';
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'CREATE': return 'Create';
            case 'UPDATE': return 'Update';
            case 'DELETE': return 'Delete';
            default: return 'Action';
        }
    };

    const filteredLogs = selectedUser === 'all'
        ? logs
        : logs.filter(log => log.actorName === selectedUser);

    return (
        <Card className="w-full overflow-hidden border-none shadow-none bg-transparent flex flex-col h-full group/card section-enter">
            <CardHeader
                className="p-4 cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-500/5 transition-all duration-500 flex flex-row items-center justify-between gap-2 border-b border-slate-200/60 dark:border-white/[0.06] shrink-0"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl shadow-lg shadow-blue-200/40 dark:shadow-blue-950/25 group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500">
                        <History className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-base font-black text-slate-800 dark:text-slate-100 tracking-tight truncate">
                        Activity Log
                        {sheetName && (
                            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 ml-2">— {sheetName}</span>
                        )}
                        <span className="text-[10px] text-cyan-500 dark:text-cyan-400 font-bold ml-1">LIVE</span>
                    </CardTitle>
                </div>
                <ChevronDown className={cn("w-5 h-5 text-slate-400 transition-transform duration-300", isOpen ? "rotate-180" : "rotate-0")} />

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-[140px] h-9 bg-slate-50 dark:bg-white/[0.06] border-slate-200 dark:border-white/[0.08] rounded-lg font-semibold text-slate-700 dark:text-slate-300 focus:ring-blue-100 dark:focus:ring-blue-500/20 shadow-sm hover:bg-slate-100 dark:hover:bg-white/[0.1] text-xs">
                            <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px] bg-white/95 dark:bg-[#20263a]/95 border-slate-200/70 dark:border-white/[0.08]" align="end">
                            <SelectItem value="all" className="text-xs font-medium cursor-pointer py-2">All Users</SelectItem>
                            {members.map(m => (
                                <SelectItem key={m.id} value={m.name} className="text-xs font-medium cursor-pointer py-2">{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="p-0 border-t border-slate-100 dark:border-white/[0.06] flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {isLoading && logs.length === 0 ? (
                            <div className="flex justify-center p-4 text-slate-400 dark:text-slate-500 font-medium italic">Loading data...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center p-4 text-slate-400 dark:text-slate-500 italic">
                                {selectedUser === 'all' ? 'No activities yet.' : `No activities from ${selectedUser}.`}
                            </div>
                        ) : (
                            filteredLogs.map(log => (
                                <div
                                    key={log.id}
                                    className="p-3 rounded-xl border border-slate-200/70 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-200 dark:hover:border-blue-500/25 flex flex-col gap-1.5"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-2">
                                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider", getActionColor(log.action))}>
                                                {getActionLabel(log.action)}
                                            </span>
                                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">{log.actorName}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 pl-1 leading-relaxed">
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
