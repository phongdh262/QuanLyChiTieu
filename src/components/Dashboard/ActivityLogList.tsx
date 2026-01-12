import React, { useEffect, useState } from 'react';

interface Log {
    id: number;
    description: string;
    actorName: string;
    action: string;
    createdAt: string;
}

export default function ActivityLogList() {
    const [isOpen, setIsOpen] = useState(true); // Default OPEN
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
            const res = await fetch('/api/activity-logs'); // Need to create this API
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

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE': return '🟢';
            case 'UPDATE': return '🟡';
            case 'DELETE': return '🔴';
            default: return '⚪️';
        }
    };

    return (
        <div className="card" style={{ marginTop: '2rem' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                    marginBottom: isOpen ? '1rem' : '0',
                    padding: '0.5rem 0'
                }}
            >
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>📜</span> Nhật Ký Hoạt Động
                </h2>
                <div style={{
                    width: '32px', height: '32px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isOpen ? '#eff6ff' : '#f3f4f6',
                    borderRadius: '50%',
                    color: isOpen ? 'var(--primary)' : '#6b7280',
                    transition: 'all 0.2s ease'
                }}>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        style={{
                            width: '20px', height: '20px',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            {isOpen && (
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {logs.length === 0 ? (
                                <div style={{ fontStyle: 'italic', color: '#9ca3af', textAlign: 'center' }}>Chưa có hoạt động nào.</div>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        background: '#f9fafb',
                                        fontSize: '0.9rem',
                                        border: '1px solid #f3f4f6'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600 }}>{getActionIcon(log.action)} {log.actorName}</span>
                                            <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                                                {new Date(log.createdAt).toLocaleString('vi-VN')}
                                            </span>
                                        </div>
                                        <div style={{ color: '#4b5563', lineHeight: '1.4' }}>
                                            {log.description}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
