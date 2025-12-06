import React from 'react';
import { Card, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';

 type AuditItem = {
  id: string;
  userId?: string | null;
  action: string;
  method: string;
  path: string;
  entity?: string | null;
  entityId?: string | null;
  createdAt: string;
};

 export const AdminAuditPage: React.FC = () => {
  const { data, isLoading } = useQuery<AuditItem[]>({
    queryKey: ['admin-audit'],
    queryFn: async () => (await api.get('/admin/audit', { params: { limit: 200 } })).data,
  });

  return (
    <Card title="Аудит действий">
      <Table<AuditItem>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 20 }}
        columns={[
          { title: 'Время', dataIndex: 'createdAt', render: (v)=> String(v).replace('T',' ').slice(0,19) },
          { title: 'Метод', dataIndex: 'method', render: (v)=> <Tag>{v}</Tag> },
          { title: 'Путь', dataIndex: 'path' },
          { title: 'Действие', dataIndex: 'action' },
          { title: 'Сущность', dataIndex: 'entity' },
          { title: 'ID', dataIndex: 'entityId' },
          { title: 'Пользователь', dataIndex: 'userId' },
        ]}
      />
    </Card>
  );
 }
