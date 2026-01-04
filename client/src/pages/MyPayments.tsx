import React from 'react';
import { Card, Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { labelPaymentStatus } from '../i18n/labels';

 type Payment = {
  id: string;
  date: string;
  amount: number;
  status: 'PENDING'|'APPLIED'|'UNRESOLVED'|'REFUNDED';
};

export const MyPaymentsPage: React.FC = () => {
  const { data, isLoading } = useQuery<Payment[]>({ queryKey: ['me','payments'], queryFn: async ()=> (await api.get('/me/payments')).data });
  return (
    <Card title="Мои платежи">
      <Table<Payment>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).slice(0,10) },
          { title: 'Сумма', dataIndex: 'amount' },
          { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='APPLIED'?'green':v==='PENDING'?'default':v==='UNRESOLVED'?'orange':'red'}>{labelPaymentStatus(v)}</Tag> },
        ]}
      />
    </Card>
  );
};
