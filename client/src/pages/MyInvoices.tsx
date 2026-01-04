import React from 'react';
import { Card, Table, Tag, Button, Space, App as AntApp } from 'antd';
import { labelInvoiceStatus } from '../i18n/labels';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';

 type Invoice = {
  id: string;
  number: string;
  date: string;
  status: 'DRAFT'|'PARTIALLY_PAID'|'PAID'|'OVERDUE';
  accrual: { total: number };
};

export const MyInvoicesPage: React.FC = () => {
  const { message } = AntApp.useApp();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<Invoice[]>({ queryKey: ['me','invoices'], queryFn: async ()=> (await api.get('/me/invoices')).data });

  const payMutation = useMutation({
    mutationFn: async (id: string)=> (await api.post('/checkout/pay', { invoiceId: id })).data,
    onSuccess: async ()=> { await qc.invalidateQueries({ queryKey: ['me','invoices'] }); message.success('Счет оплачен'); }
  });

  return (
    <Card title="Мои счета">
      <Table<Invoice>
        rowKey="id"
        loading={isLoading}
        dataSource={data || []}
        pagination={{ pageSize: 10 }}
        columns={[
          { title: '№', dataIndex: 'number' },
          { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).slice(0,10) },
          { title: 'Сумма', dataIndex: ['accrual','total'] },
          { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='PAID'?'green':v==='OVERDUE'?'red':v==='PARTIALLY_PAID'?'orange':'default'}>{labelInvoiceStatus(v)}</Tag> },
          { title: 'Действия', key: 'a', render: (_: any, r)=> (
            <Space>
              {r.status!=='PAID' && <Button type="primary" size="small" loading={payMutation.isPending} onClick={()=> payMutation.mutate(r.id)}>Оплатить</Button>}
            </Space>
          ) },
        ]}
      />
    </Card>
  );
};
