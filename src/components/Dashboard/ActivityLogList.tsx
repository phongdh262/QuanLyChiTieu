import React, { useState } from 'react';
import { Member } from '@/types/expense';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { History } from "lucide-react";
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
}

const fetcher = (url: string) => fetch(url).then(r => r.json());

export default function ActivityLogList({ members }: Props) {
    const [isOpen, setIsOpen] = useState(true); // Default OPEN
    const [selectedUser, setSelectedUser] = useState<string>('all');

    const { data: logs = [], isLoading } = useSWR<Log[]>(
        isOpen ? '/api/activity-logs' : null,
        fetcher,
        {
            refreshInterval: 10000, // Poll every 10 seconds
            revalidateOnFocus: true,
            dedupingInterval: 2000
        }
    );

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
        <Card className="w-full premium-card overflow-hidden border-none soft-shadow group/card">
            <CardHeader
                className="p-4 cursor-pointer hover:bg-indigo-50/30 transition-all duration-500 flex flex-row items-center justify-between gap-2 border-b border-indigo-50/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl shadow-lg shadow-indigo-100 group-hover/card:scale-110 group-hover/card:rotate-3 transition-all duration-500">
                        <History className="w-4 h-4 text-white" />
                    </div>
                    <CardTitle className="text-base font-black text-slate-800 tracking-tight truncate">
                        Activity Log <span className="text-[10px] text-indigo-400 font-bold ml-1">LIVE</span>
                    </CardTitle>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-[140px] h-9 bg-slate-50 border-slate-200 rounded-lg font-semibold text-slate-700 focus:ring-purple-100 shadow-sm hover:bg-slate-100 text-xs">
                            <SelectValue placeholder="All Users" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]" align="end">
                            <SelectItem value="all" className="text-xs font-medium cursor-pointer py-2">All Users</SelectItem>
                            {members.map(m => (
                                <SelectItem key={m.id} value={m.name} className="text-xs font-medium cursor-pointer py-2">{m.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>

            {isOpen && (
                <CardContent className="p-0 border-t border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="h-[350px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {isLoading && logs.length === 0 ? (
                            <div className="flex justify-center p-4 text-slate-400 font-medium italic">Loading data...</div>
                        ) : filteredLogs.length === 0 ? (
                            <div className="text-center p-4 text-slate-400 italic">
                                {selectedUser === 'all' ? 'No activities yet.' : `No activities from ${selectedUser}.`}
                            </div>
                        ) : (
                            filteredLogs.map(log => (
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
