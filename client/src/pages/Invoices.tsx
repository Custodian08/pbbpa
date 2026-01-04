import React from 'react';
import { Button, Card, DatePicker, Flex, Space, Table, Tag, Input, Select, App as AntApp, Modal } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import dayjs, { Dayjs } from 'dayjs';
import { toPng } from 'html-to-image';

type Invoice = {
  id: string;
  accrualId: string;
  number: string;
  date: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED';
};

export const InvoicesPage: React.FC = () => {
  const qc = useQueryClient();
  const [period, setPeriod] = React.useState<Dayjs | null>(dayjs());
  const periodStr = period ? period.format('YYYY-MM') : undefined;
  const [q, setQ] = React.useState('');
  const [status, setStatus] = React.useState<string | undefined>(undefined);
  const { message } = AntApp.useApp();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const tableRef = React.useRef<HTMLDivElement>(null);
  const [resultOpen, setResultOpen] = React.useState(false);
  const [result, setResult] = React.useState<any | null>(null);

  const { data, isLoading, refetch } = useQuery<{ items: Invoice[]; total: number; page: number; pageSize: number}>({
    queryKey: ['invoices', periodStr, status, q, page, pageSize],
    queryFn: async () => (await api.get('/billing/invoices', { params: {
      period: periodStr,
      status,
      search: q || undefined,
      page,
      pageSize,
    }})).data,
  });

  const runBilling = useMutation({
    mutationFn: async () => (await api.post('/billing/run', { period: periodStr! })).data,
    onSuccess: async (res) => {
      await qc.invalidateQueries({ queryKey: ['invoices'] });
      await refetch();
      setResult(res);
      setResultOpen(true);
      message.success('Биллинг выполнен');
    },
    onError: (err: any) => {
      const data = err?.response?.data;
      const msg = (typeof data === 'string' && data) || data?.message || err?.message || 'Не удалось запустить биллинг';
      message.error(`Ошибка биллинга: ${msg}`);
    }
  });

  const exportPng = async () => {
    if (!tableRef.current) return;
    const dataUrl = await toPng(tableRef.current, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `invoices${periodStr ? '-' + periodStr : ''}.png`;
    a.click();
  };

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async (id: string, number: string) => {
    const res = await api.get(`/reports/invoice/${id}.pdf`, { responseType: 'blob' });
    download(res.data, `${number}.pdf`);
  };

  return (
    <>
    <Card title="Счета">
      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Space>
          <DatePicker picker="month" value={period} onChange={(v)=> setPeriod(v)} format="YYYY-MM" />
          <Input allowClear placeholder="Поиск по номеру" value={q} onChange={(e)=> setQ(e.target.value)} style={{ width: 200 }} />
          <Select allowClear placeholder="Статус" value={status} onChange={setStatus} style={{ width: 180 }}
            options={[
              { value: 'DRAFT', label: 'DRAFT' },
              { value: 'SENT', label: 'SENT' },
              { value: 'PARTIALLY_PAID', label: 'PARTIALLY_PAID' },
              { value: 'PAID', label: 'PAID' },
              { value: 'OVERDUE', label: 'OVERDUE' },
              { value: 'CANCELLED', label: 'CANCELLED' },
            ]}
          />
        </Space>
        <Space>
          <Button onClick={exportPng}>Экспорт PNG</Button>
          <Button type="primary" onClick={()=> runBilling.mutate()} disabled={!periodStr} loading={runBilling.isPending}>Запустить биллинг</Button>
        </Space>
      </Flex>
      <div ref={tableRef}>
        <Table<Invoice>
          rowKey="id"
          loading={isLoading}
          dataSource={data?.items || []}
          pagination={{
            current: page,
            pageSize,
            total: data?.total || 0,
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          columns={[
            { title: '№', dataIndex: 'number' },
            { title: 'Дата', dataIndex: 'date', render: (v) => String(v).slice(0,10) },
            { title: 'Статус', dataIndex: 'status', render: (v) => <Tag color={v==='PAID'?'green':v==='PARTIALLY_PAID'?'orange':v==='OVERDUE'?'red':'default'}>{v}</Tag> },
            { title: 'Действия', key: 'actions', render: (_: any, r) => (
              <Space>
                <Button size="small" onClick={() => exportPdf(r.id, r.number)}>PDF</Button>
              </Space>
            )},
          ]}
        />
      </div>
    </Card>

    <Modal open={resultOpen} title="Результаты биллинга" onCancel={() => setResultOpen(false)} footer={null} width={900}>
      <div style={{ marginBottom: 12 }}>
        <div>Период: {result?.period || periodStr}</div>
        <div>Обработано договоров: {result?.processed ?? 0}</div>
        <div>Создано счетов: {(result?.results||[]).filter((r: any)=> r.invoiceId).length}</div>
        <div>Пропущено: {(result?.results||[]).filter((r: any)=> !r.invoiceId).length}</div>
      </div>
      <Table
        rowKey={(r: any) => r.accrualId || r.leaseId}
        dataSource={result?.results || []}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: 'Договор', dataIndex: 'leaseNumber', render: (v: any, r: any)=> v || r.leaseId },
          { title: 'Арендатор', dataIndex: 'tenantName' },
          { title: 'Помещение', dataIndex: 'premiseAddress' },
          { title: 'Счет', dataIndex: 'invoiceNumber' },
          { title: 'Итого, BYN', dataIndex: 'total' },
          { title: 'Результат', dataIndex: 'messageRu', render: (v: any)=> v || '—' },
        ]}
      />
    </Modal>
    </>
  );
};
