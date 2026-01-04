import React from 'react';
import { Card, Table, Tag, Space } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { Link } from 'react-router-dom';

 type Lease = {
  id: string;
  number?: string | null;
  status: 'DRAFT'|'ACTIVE'|'TERMINATING'|'CLOSED';
  periodFrom: string;
  periodTo?: string | null;
  base: 'M2'|'FIXED';
  dueDay: number;
  premise?: { code?: string | null; address: string };
};

export const MyLeasesPage: React.FC = () => {
  const { data, isLoading } = useQuery<Lease[]>({ queryKey: ['me','leases'], queryFn: async ()=> (await api.get('/me/leases')).data });
  return (
    <Card title="Мои договоры">
      <Table<Lease>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '№', dataIndex: 'number' },
          { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='ACTIVE'?'green':v==='DRAFT'?'default':v==='TERMINATING'?'orange':'blue'}>{v}</Tag> },
          { title: 'Помещение', dataIndex: ['premise','address'], render: (_: any, r)=> r.premise?.code ? `${r.premise.code} — ${r.premise.address}` : r.premise?.address },
          { title: 'Период с', dataIndex: 'periodFrom', render: (v)=> String(v).slice(0,10) },
          { title: 'по', dataIndex: 'periodTo', render: (v)=> v? String(v).slice(0,10) : '' },
          { title: 'Действия', key: 'a', render: (_: any, r)=> <Space><Link to={`/my/leases/${r.id}`}>Открыть</Link></Space> },
        ]}
      />
    </Card>
  );
};
