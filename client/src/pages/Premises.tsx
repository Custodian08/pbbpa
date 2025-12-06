import React from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, App as AntApp } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { toPng } from 'html-to-image';

type Premise = {
  id: string;
  code?: string | null;
  type: 'OFFICE' | 'RETAIL' | 'WAREHOUSE';
  address: string;
  floor?: number | null;
  area: number;
  rateType: 'M2' | 'FIXED';
  baseRate?: number | null;
  status: 'FREE' | 'RENTED' | 'RESERVED';
  availableFrom?: string | null;
};

const types = [
  { label: 'Офис', value: 'OFFICE' },
  { label: 'Ритейл', value: 'RETAIL' },
  { label: 'Склад', value: 'WAREHOUSE' },
];
const rateTypes = [
  { label: 'BYN/м²', value: 'M2' },
  { label: 'Фикс', value: 'FIXED' },
];

export const PremisesPage: React.FC = () => {
  const qc = useQueryClient();
  const { message, modal } = AntApp.useApp();
  const { data, isLoading } = useQuery<Premise[]>({
    queryKey: ['premises'],
    queryFn: async () => (await api.get('/premises')).data,
  });

  const [open, setOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importCsv, setImportCsv] = React.useState('');
  const [importing, setImporting] = React.useState(false);
  const [form] = Form.useForm();
  const [q, setQ] = React.useState('');
  const [type, setType] = React.useState<string | undefined>(undefined);
  const [status, setStatus] = React.useState<string | undefined>(undefined);

  const createMutation = useMutation({
    mutationFn: async (values: any) => {
      return (await api.post('/premises', values)).data;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['premises'] });
      setOpen(false);
      form.resetFields();
      message.success('Помещение создано');
    },
  });

  const download = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url);
  };

  const downloadCsv = async () => {
    const res = await api.get('/reports/templates/premises.csv', { responseType: 'blob' });
    download(res.data, 'premises-template.csv');
  };

  const tableRef = React.useRef<HTMLDivElement>(null);

  const exportPng = async () => {
    if (!tableRef.current) return;
    const dataUrl = await toPng(tableRef.current, { cacheBust: true, pixelRatio: 2 });
    const a = document.createElement('a');
    a.href = dataUrl; a.download = 'premises.png'; a.click();
  };

  // Парсинг CSV и импорт
  const parseCsv = (csv: string) => {
    const lines = csv.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return [];
    const header = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
      const cols = line.split(',').map(c => c.trim());
      const rec: any = {};
      header.forEach((h, i) => { rec[h] = cols[i] ?? ''; });
      if (rec.floor !== '' && rec.floor !== undefined) rec.floor = Number(rec.floor);
      if (rec.area !== '' && rec.area !== undefined) rec.area = Number(rec.area);
      if (rec.baseRate !== '' && rec.baseRate !== undefined) rec.baseRate = Number(rec.baseRate);
      return rec;
    });
  };

  const doImport = async () => {
    try {
      setImporting(true);
      const rows = parseCsv(importCsv);
      const res = await api.post('/premises/import', rows);
      const ok = Number(res.data?.imported || 0);
      message.success(`Импорт завершен: ${ok}/${rows.length}`);
      setImportOpen(false);
      setImportCsv('');
      await qc.invalidateQueries({ queryKey: ['premises'] });
    } catch {
      message.error('Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  const remove = (id: string) => {
    modal.confirm({
      title: 'Удалить помещение?', okText: 'Да', cancelText: 'Нет',
      onOk: async () => { await api.delete(`/premises/${id}`); await qc.invalidateQueries({ queryKey: ['premises'] }); message.success('Удалено'); },
    });
  };

  const filtered = React.useMemo(() => {
    const list = data || [];
    const ql = q.trim().toLowerCase();
    return list.filter((r) => {
      if (type && r.type !== (type as any)) return false;
      if (status && r.status !== (status as any)) return false;
      if (!ql) return true;
      const code = (r.code || '').toLowerCase();
      const addr = (r.address || '').toLowerCase();
      return code.includes(ql) || addr.includes(ql);
    });
  }, [data, q, type, status]);

  return (
    <Card title="Помещения" extra={<Space>
      <Button onClick={exportPng}>Экспорт PNG</Button>
      <Button onClick={downloadCsv}>Шаблон premises.csv</Button>
      <Button onClick={()=> setImportOpen(true)}>Импорт CSV</Button>
      <Button type="primary" onClick={() => setOpen(true)}>Добавить</Button>
    </Space>}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search allowClear placeholder="Поиск: код/адрес" value={q} onChange={(e)=> setQ(e.target.value)} style={{ width: 280 }} />
        <Select allowClear placeholder="Тип" value={type} onChange={setType} style={{ width: 160 }} options={types} />
        <Select allowClear placeholder="Статус" value={status} onChange={setStatus} style={{ width: 160 }} options={[
          { label: 'FREE', value: 'FREE' },
          { label: 'RENTED', value: 'RENTED' },
          { label: 'RESERVED', value: 'RESERVED' },
        ]} />
      </Space>
      <div ref={tableRef}>
        <Table<Premise>
          rowKey="id"
          loading={isLoading}
          dataSource={filtered}
          pagination={{ pageSize: 10 }}
          columns={[
            { title: 'Код', dataIndex: 'code' },
            { title: 'Тип', dataIndex: 'type', render: (v) => <Tag>{v}</Tag> },
            { title: 'Адрес', dataIndex: 'address' },
            { title: 'Этаж', dataIndex: 'floor' },
            { title: 'Площадь, м²', dataIndex: 'area' },
            { title: 'Тариф', dataIndex: 'rateType' },
            { title: 'Базовая ставка', dataIndex: 'baseRate' },
            { title: 'Статус', dataIndex: 'status', render: (v) => <Tag color={v==='FREE'?'green':v==='RESERVED'?'orange':'blue'}>{v}</Tag> },
            { title: 'Доступно с', dataIndex: 'availableFrom', render: (v) => (v ? String(v).slice(0,10) : '') },
            { title: 'Действия', key: 'actions', render: (_: any, r) => (
              <Space>
                <Button danger size="small" onClick={()=> remove(r.id)}>Удалить</Button>
              </Space>
            )},
          ]}
        />
      </div>

      <Modal open={open} title="Новое помещение" onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending} okText="Сохранить">
        <Form form={form} layout="vertical" onFinish={(values)=> createMutation.mutate(values)}>
          <Form.Item label="Код" name="code"><Input /></Form.Item>
          <Form.Item label="Тип" name="type" rules={[{ required: true }]}>
            <Select options={types} placeholder="Выберите тип" />
          </Form.Item>
          <Form.Item label="Адрес" name="address" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Space.Compact block>
            <Form.Item label="Этаж" name="floor" style={{ width: '30%' }}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item label="Площадь, м²" name="area" rules={[{ required: true }]} style={{ width: '70%' }}>
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
            </Form.Item>
          </Space.Compact>
          <Space.Compact block>
            <Form.Item label="Тариф" name="rateType" rules={[{ required: true }]} style={{ width: '50%' }}>
              <Select options={rateTypes} />
            </Form.Item>
            <Form.Item label="Базовая ставка" name="baseRate" style={{ width: '50%' }}>
              <InputNumber min={0} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Space.Compact>
        </Form>
      </Modal>

      <Modal open={importOpen} title="Импорт помещений (CSV)" onCancel={()=> setImportOpen(false)} onOk={doImport} okText="Импортировать" confirmLoading={importing}>
        <p>Вставьте CSV с заголовком: code,type,address,floor,area,rateType,baseRate,status,availableFrom</p>
        <Input.TextArea rows={8} value={importCsv} onChange={(e)=> setImportCsv(e.target.value)} placeholder="A-101,OFFICE,г. Минск...,5,45.5,M2,25.00,FREE,2025-01-01" />
      </Modal>
    </Card>
  );
};