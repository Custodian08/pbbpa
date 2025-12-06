import React from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Card, Descriptions, Tabs, Table, Tag, Space, Button, App as AntApp, Modal, Form, DatePicker, InputNumber } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../modules/auth/AuthContext';
import { toPng } from 'html-to-image';

 type Lease = {
  id: string;
  number?: string | null;
  date?: string | null;
  periodFrom: string;
  periodTo?: string | null;
  base: 'M2' | 'FIXED';
  currency: string;
  vatRate: number;
  deposit?: number | null;
  dueDay: number;
  penaltyRatePerDay: number;
  status: 'DRAFT' | 'ACTIVE' | 'TERMINATING' | 'CLOSED';
  premise?: { code?: string | null; address: string; area: number };
  tenant?: { name: string };
};

 type Accrual = { id: string; period: string; baseAmount: number; vatAmount: number; total: number };
 type Invoice = { id: string; number: string; date: string; status: string; accrualId: string };
 type Payment = { id: string; date: string; amount: number; status: string; source: string };
 type Indexation = { id: string; factor: number; effectiveFrom: string };

 export const LeaseDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message } = AntApp.useApp();
  const { user } = useAuth();
  const isAdmin = (user?.roles || []).includes('ADMIN');
  const isOperator = (user?.roles || []).includes('OPERATOR');
  const cardRef = React.useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: lease, isLoading, refetch } = useQuery<Lease>({ queryKey: ['lease', id], queryFn: async () => (await api.get(`/leases/${id}`)).data });
  const { data: accruals } = useQuery<Accrual[]>({ queryKey: ['lease-accruals', id], queryFn: async () => (await api.get(`/leases/${id}/accruals`)).data });
  const { data: invoices } = useQuery<Invoice[]>({ queryKey: ['lease-invoices', id], queryFn: async () => (await api.get(`/leases/${id}/invoices`)).data });
  const { data: payments } = useQuery<Payment[]>({ queryKey: ['lease-payments', id], queryFn: async () => (await api.get(`/leases/${id}/payments`)).data });
  const { data: indexations } = useQuery<Indexation[]>({ queryKey: ['lease-indexations', id], queryFn: async () => (await api.get(`/leases/${id}/indexations`)).data });

  const [ixOpen, setIxOpen] = React.useState(false);
  const [ixForm] = Form.useForm();
  const addIx = useMutation({
    mutationFn: async (values: any) => (await api.post(`/leases/${id}/indexations`, { factor: Number(values.factor), effectiveFrom: values.effectiveFrom.format('YYYY-MM-DD') })).data,
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['lease-indexations', id] }); setIxOpen(false); ixForm.resetFields(); message.success('Индексация добавлена'); },
  });
  const delIx = useMutation({
    mutationFn: async (ixId: string) => (await api.delete(`/leases/${id}/indexations/${ixId}`)).data,
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ['lease-indexations', id] }); message.success('Индексация удалена'); },
  });

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const mutateAndRefresh = async (fn: ()=> Promise<any>, okMsg: string) => {
    try { await fn(); await refetch(); message.success(okMsg); } catch (e:any) { message.error('Операция не выполнена'); }
  };

  const activateLease = () => Modal.confirm({ title: 'Активировать договор?', okText: 'Да', cancelText: 'Нет', onOk: async ()=> mutateAndRefresh(()=> api.post(`/leases/${id}/activate`), 'Договор активирован') });
  const terminateLease = () => Modal.confirm({ title: 'Перевести в расторжение?', okText: 'Да', cancelText: 'Нет', onOk: async ()=> mutateAndRefresh(()=> api.post(`/leases/${id}/terminate`), 'Статус изменён') });
  const closeLease = () => Modal.confirm({ title: 'Закрыть договор?', okText: 'Да', cancelText: 'Нет', onOk: async ()=> mutateAndRefresh(()=> api.post(`/leases/${id}/close`), 'Договор закрыт') });

  const downloadInvoicePdf = async (invId: string, number: string) => {
    const res = await api.get(`/reports/invoice/${invId}.pdf`, { responseType: 'blob' });
    download(res.data, `${number}.pdf`);
  };

  const downloadActPdf = async (invId: string, number: string) => {
    const res = await api.get(`/documents/act/${invId}.pdf`, { responseType: 'blob' });
    download(res.data, `act-${number}.pdf`);
  };

  const downloadContractPdf = async () => {
    try {
      const res = await api.get(`/documents/contract/${id}.pdf`, { responseType: 'blob' });
      download(res.data, `contract-${lease?.number || (lease?.id || '').slice(0,8)}.pdf`);
    } catch (e: any) {
      message.error('Не удалось сформировать договор');
    }
  };

  const downloadContractDocx = async () => {
    try {
      const res = await api.get(`/documents/contract/${id}.docx`, { responseType: 'blob' });
      download(res.data, `contract-${lease?.number || (lease?.id || '').slice(0,8)}.docx`);
    } catch (e: any) {
      message.error('Не удалось сформировать договор (DOCX)');
    }
  };

  const exportContractPng = async () => {
    if (!cardRef.current) return;
    const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `contract-${lease?.number || (lease?.id || '').slice(0,8)}.png`;
    a.click();
  };

  const exportInvoicePng = async (id: string, number: string) => {
    const row = document.querySelector(`tr[data-row-key="${id}"]`) as HTMLElement | null;
    if (!row) return;
    const dataUrl = await toPng(row, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${number}.png`;
    a.click();
  };

  return (
    <Card loading={isLoading} title={`Договор ${lease?.number || lease?.id.slice(0,8)}`} extra={
      <Space>
        <Button onClick={downloadContractPdf}>Договор (PDF)</Button>
        {isAdmin && <Button onClick={downloadContractDocx}>Договор (DOCX)</Button>}
        {isAdmin && <Button onClick={exportContractPng}>Договор (PNG)</Button>}
        {(isAdmin || isOperator) && lease?.status==='DRAFT' && <Button type="primary" onClick={activateLease}>Активировать</Button>}
        {(isAdmin) && lease?.status==='ACTIVE' && <Button danger onClick={terminateLease}>На расторжении</Button>}
        {(isAdmin) && (lease?.status==='ACTIVE' || lease?.status==='TERMINATING') && <Button onClick={closeLease}>Закрыть</Button>}
      </Space>
    }>
      {lease && (
        <>
          <div ref={cardRef}>
            <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Статус"><Tag color={lease.status==='ACTIVE'?'green':lease.status==='DRAFT'?'default':lease.status==='TERMINATING'?'orange':'blue'}>{lease.status}</Tag></Descriptions.Item>
              <Descriptions.Item label="Арендатор">{lease.tenant?.name}</Descriptions.Item>
              <Descriptions.Item label="Помещение">{lease.premise?.code ? `${lease.premise.code} — ${lease.premise.address}` : lease.premise?.address}</Descriptions.Item>
              <Descriptions.Item label="Период">{String(lease.periodFrom).slice(0,10)} — {lease.periodTo? String(lease.periodTo).slice(0,10): ''}</Descriptions.Item>
              <Descriptions.Item label="База">{lease.base}</Descriptions.Item>
              <Descriptions.Item label="Оплата, день">{lease.dueDay}</Descriptions.Item>
            </Descriptions>
          </div>
          <Tabs
            items={[
              {
                key: 'accruals',
                label: 'Начисления',
                children: (
                  <Table<Accrual>
                    rowKey="id"
                    dataSource={accruals || []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Период', dataIndex: 'period', render: (v)=> String(v).slice(0,10) },
                      { title: 'База', dataIndex: 'baseAmount' },
                      { title: 'НДС', dataIndex: 'vatAmount' },
                      { title: 'Итого', dataIndex: 'total' },
                    ]}
                  />
                )
              },
              {
                key: 'invoices',
                label: 'Счета',
                children: (
                  <Table<Invoice>
                    rowKey="id"
                    dataSource={invoices || []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: '№', dataIndex: 'number' },
                      { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).slice(0,10) },
                      { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag>{v}</Tag> },
                      { title: 'Действия', key: 'a', render: (_: any, r)=> (
                        <Space>
                          <Button size="small" onClick={()=> downloadInvoicePdf(r.id, r.number)}>Счет (PDF)</Button>
                          {isAdmin && <Button size="small" onClick={()=> downloadActPdf(r.id, r.number)}>Акт (PDF)</Button>}
                          {isAdmin && <Button size="small" onClick={async ()=> {
                            const res = await api.get(`/documents/invoice/${r.id}.docx`, { responseType: 'blob' });
                            download(res.data, `${r.number}.docx`);
                          }}>Счет (DOCX)</Button>}
                          {isAdmin && <Button size="small" onClick={()=> exportInvoicePng(r.id, r.number)}>Счет (PNG)</Button>}
                        </Space>
                      )}
                    ]}
                  />
                )
              },
              {
                key: 'payments',
                label: 'Платежи',
                children: (
                  <Table<Payment>
                    rowKey="id"
                    dataSource={payments || []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).slice(0,10) },
                      { title: 'Сумма', dataIndex: 'amount' },
                      { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag>{v}</Tag> },
                      { title: 'Источник', dataIndex: 'source' },
                    ]}
                  />
                )
              },
              {
                key: 'indexations',
                label: 'Индексации',
                children: (
                  <>
                    {(isAdmin || isOperator) && (
                      <div style={{ marginBottom: 12 }}>
                        <Button type="primary" onClick={()=> setIxOpen(true)}>Добавить индексацию</Button>
                      </div>
                    )}
                    <Table<Indexation>
                      rowKey="id"
                      dataSource={indexations || []}
                      pagination={{ pageSize: 10 }}
                      columns={[
                        { title: 'Дата действия', dataIndex: 'effectiveFrom', render: (v)=> String(v).slice(0,10) },
                        { title: 'Коэффициент', dataIndex: 'factor' },
                        { title: 'Действия', key: 'a', render: (_: any, r)=> (
                          <Space>
                            {(isAdmin) && <Button size="small" danger onClick={()=> delIx.mutate(r.id)}>Удалить</Button>}
                          </Space>
                        )}
                      ]}
                    />

                    <Modal open={ixOpen} title="Новая индексация" onCancel={()=> setIxOpen(false)} onOk={()=> ixForm.submit()} okText="Сохранить" confirmLoading={addIx.isPending}>
                      <Form form={ixForm} layout="vertical" onFinish={(v)=> addIx.mutate(v)} initialValues={{ factor: 1 }}>
                        <Form.Item label="Дата действия" name="effectiveFrom" rules={[{ required: true }]}>
                          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                        </Form.Item>
                        <Form.Item label="Коэффициент" name="factor" rules={[{ required: true }]}>
                          <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
                        </Form.Item>
                      </Form>
                    </Modal>
                  </>
                )
              }
            ]}
          />
        </>
      )}
    </Card>
  );
 }
