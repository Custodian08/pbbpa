import React from 'react';
import { Button, Card, DatePicker, Form, Input, InputNumber, Modal, Select, Table, Tag, Space } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import dayjs, { Dayjs } from 'dayjs';
import { toPng } from 'html-to-image';

 type Payment = {
  id: string;
  tenantId: string;
  amount: number;
  date: string;
  linkedInvoiceId?: string | null;
  status: 'PENDING' | 'APPLIED' | 'UNRESOLVED' | 'REFUNDED';
  source: 'IMPORT' | 'MANUAL';
};

 type Tenant = { id: string; name: string };

 const sources = [
  { label: 'Вручную', value: 'MANUAL' },
  { label: 'Импорт', value: 'IMPORT' },
 ];

 export const PaymentsPage: React.FC = () => {
  const qc = useQueryClient();
  const { data: tenants } = useQuery<Tenant[]>({ queryKey: ['tenants'], queryFn: async () => (await api.get('/tenants')).data });
  const byId = React.useMemo(() => Object.fromEntries((tenants||[]).map(t=>[t.id, t.name])), [tenants]);

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);

  const [open, setOpen] = React.useState(false);
  const [unresolvedOpen, setUnresolvedOpen] = React.useState(false);
const [applyForm] = Form.useForm();
  const [form] = Form.useForm();
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const [source, setSource] = React.useState<string | undefined>(undefined);
  const [dateRange, setDateRange] = React.useState<[Dayjs | null, Dayjs | null] | null>(null);
  const tableRef = React.useRef<HTMLDivElement>(null);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      const payload = {
        tenantId: values.tenantId,
        amount: Number(values.amount),
        date: (values.date as Dayjs).format('YYYY-MM-DD'),
        invoiceNumber: values.invoiceNumber || undefined,
        source: values.source || 'MANUAL',
      };
      return (await api.post('/payments', payload)).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['payments'] });
      setOpen(false);
      form.resetFields();
    }
  });

  const { data, isLoading } = useQuery<{ items: Payment[]; total: number; page: number; pageSize: number}>({
    queryKey: ['payments', page, pageSize, q, status, source, dateRange?.[0]?.format('YYYY-MM-DD'), dateRange?.[1]?.format('YYYY-MM-DD')],
    queryFn: async () => (await api.get('/payments', { params: {
      page, pageSize,
      search: q || undefined,
      status,
      source,
      dateFrom: dateRange?.[0]?.format('YYYY-MM-DD'),
      dateTo: dateRange?.[1]?.format('YYYY-MM-DD'),
    }})).data,
  });

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    if (!tableRef.current) return;
    const dataUrl = await toPng(tableRef.current, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'payments.png';
    a.click();
  };

  const downloadCsv = async (kind: 'tenants'|'premises'|'payments') => {
    const res = await api.get(`/reports/templates/${kind}.csv`, { responseType: 'blob' });
    download(res.data, `${kind}-template.csv`);
  };

  const { data: unresolved, isFetching: unresolvedLoading, refetch: refetchUnresolved } = useQuery<{
  id: string; tenantId: string; amount: number; date: string; status: string;
}[]>({
  queryKey: ['payments','unresolved', unresolvedOpen],
  queryFn: async () => (await api.get('/payments/unresolved')).data,
  enabled: unresolvedOpen,
});

const applyPayment = useMutation({
  mutationFn: async (values: { id: string; invoiceNumber: string }) => (await api.post(`/payments/${values.id}/apply`, { invoiceNumber: values.invoiceNumber })).data,
  onSuccess: async () => { await refetchUnresolved(); await qc.invalidateQueries({ queryKey: ['payments'] }); applyForm.resetFields(); },
});
const refundPayment = useMutation({
  mutationFn: async (id: string) => (await api.post(`/payments/${id}/refund`)).data,
  onSuccess: async () => { await refetchUnresolved(); await qc.invalidateQueries({ queryKey: ['payments'] }); },
});
  return (
    <Card title="Платежи" extra={<Space>
      <Button onClick={exportPng}>Экспорт PNG</Button>
      <Button onClick={()=> { setUnresolvedOpen(true); refetchUnresolved(); }}>Нерешенные</Button>
      <Button onClick={()=> downloadCsv('payments')}>Шаблон payments.csv</Button>
      <Button onClick={()=> downloadCsv('tenants')}>Шаблон tenants.csv</Button>
      <Button onClick={()=> downloadCsv('premises')}>Шаблон premises.csv</Button>
      <Button type="primary" onClick={()=> setOpen(true)}>Добавить</Button>
    </Space>}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input allowClear placeholder="Поиск: арендатор/счёт" value={q} onChange={(e)=> setQ(e.target.value)} style={{ width: 260 }} />
        <Select allowClear placeholder="Статус" value={status} onChange={setStatus} style={{ width: 160 }} options={[
          { label: 'PENDING', value: 'PENDING' },
          { label: 'APPLIED', value: 'APPLIED' },
          { label: 'UNRESOLVED', value: 'UNRESOLVED' },
          { label: 'REFUNDED', value: 'REFUNDED' },
        ]} />
        <Select allowClear placeholder="Источник" value={source} onChange={setSource} style={{ width: 160 }} options={sources} />
        <DatePicker.RangePicker value={dateRange as any} onChange={(v)=> setDateRange(v as any)} format="YYYY-MM-DD" />
      </Space>
      <div ref={tableRef}>
        <Table<Payment>
          rowKey="id"
          loading={isLoading}
          dataSource={data?.items || []}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p, ps)=> { setPage(p); setPageSize(ps); },
          }}
          columns={[
            { title: 'Арендатор', dataIndex: 'tenantId', render: (v)=> byId[v] || v },
            { title: 'Сумма', dataIndex: 'amount' },
            { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).slice(0,10) },
            { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='APPLIED'?'green':v==='UNRESOLVED'?'orange':'default'}>{v}</Tag> },
            { title: 'Источник', dataIndex: 'source' },
          ]}
        />
      </div>

      <Modal open={open} title="Новый платеж" onCancel={()=> setOpen(false)} onOk={()=> form.submit()} okText="Сохранить" confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={(values)=> createMutation.mutate(values)} initialValues={{ date: dayjs(), source: 'MANUAL' }}>
          <Form.Item label="Арендатор" name="tenantId" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="label" options={(tenants||[]).map(t=>({ label: t.name, value: t.id }))} />
          </Form.Item>
          <Form.Item label="Сумма" name="amount" rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} step={0.01} />
          </Form.Item>
          <Form.Item label="Дата" name="date" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item label="Номер счета (опц.)" name="invoiceNumber">
            <Input placeholder="INV-YYYYMM-0001" />
          </Form.Item>
          <Form.Item label="Источник" name="source">
            <Select options={sources} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal open={unresolvedOpen} title="Нерешенные платежи" onCancel={()=> setUnresolvedOpen(false)} footer={null} width={760}>
  <Table<{ id: string; tenantId: string; amount: number; date: string; status: string }>
    rowKey="id"
    loading={unresolvedLoading}
    dataSource={unresolved || []}
    pagination={{ pageSize: 8 }}
    columns={[
      { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).slice(0,10) },
      { title: 'Арендатор', dataIndex: 'tenantId', render: (v)=> byId[v] || v },
      { title: 'Сумма', dataIndex: 'amount' },
      { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color="orange">{v}</Tag> },
      { title: 'Действия', key: 'a', render: (_: any, r)=> (
        <Space.Compact block>
          <Form form={applyForm} layout="inline" onFinish={(v)=> applyPayment.mutate({ id: r.id, invoiceNumber: v.invoiceNumber })} style={{ width: '100%' }}>
            <Form.Item name="invoiceNumber" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input placeholder="№ счета" />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button size="small" type="primary" htmlType="submit" loading={applyPayment.isPending}>Сопоставить</Button>
                <Button size="small" danger onClick={()=> refundPayment.mutate(r.id)} loading={refundPayment.isPending}>Возврат</Button>
              </Space>
            </Form.Item>
          </Form>
        </Space.Compact>
      ) }
    ]}
  />
</Modal>
    </Card>
  );
 }
