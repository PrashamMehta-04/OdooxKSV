import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { ActivityLog, User } from '../../types';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Select from '../../components/ui/Select';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

const ENTITY_TYPES = ['vendor', 'rfq', 'quotation', 'approval', 'purchaseOrder', 'invoice', 'user'];

const ActivityLogList: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [entityType, page]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = {};
      if (entityType) params.entityType = entityType;
      const res = await api.get('/activity-logs', { params });
      if (res.data.success) setLogs(res.data.data || []);
    } catch {
      toast.error('Failed to load activity logs');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'MMM d, yyyy HH:mm:ss'); } catch { return d; }
  };

  const paginatedLogs = logs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(logs.length / pageSize);

  const columns = [
    {
      header: 'Timestamp',
      render: (row: ActivityLog) => (
        <span className="text-xs font-mono text-gray-600 whitespace-nowrap">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: 'User',
      render: (row: ActivityLog) => {
        const u = typeof row.userId === 'object' ? row.userId as User : null;
        return <span className="text-sm font-medium">{u?.name || '—'}</span>;
      },
    },
    {
      header: 'Action',
      render: (row: ActivityLog) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-50 text-primary-700">
          {row.action}
        </span>
      ),
    },
    {
      header: 'Entity Type',
      render: (row: ActivityLog) => (
        <span className="text-xs text-gray-600 capitalize">{row.entityType}</span>
      ),
    },
    {
      header: 'Entity ID',
      render: (row: ActivityLog) => (
        <span className="text-xs font-mono text-gray-500">{row.entityId?.slice(-8).toUpperCase()}</span>
      ),
    },
    {
      header: 'Details',
      render: (row: ActivityLog) => (
        <span className="text-xs text-gray-500 truncate max-w-xs block">{row.details || '—'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{logs.length} log entries</p>
        </div>
        <div className="w-48">
          <Select
            options={ENTITY_TYPES.map((t) => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))}
            placeholder="All Entity Types"
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <Card padding={false}>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            <Table
              columns={columns}
              data={paginatedLogs}
              keyExtractor={(r) => r.id}
              emptyMessage="No activity logs found."
            />
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, logs.length)} of {logs.length}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = i + 1;
                    return (
                      <button
                        key={pg}
                        onClick={() => setPage(pg)}
                        className={`px-2 py-1 text-xs rounded border ${page === pg ? 'bg-primary-500 text-white border-primary-500' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        {pg}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2 py-1 text-xs rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};

export default ActivityLogList;
