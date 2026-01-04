import React from 'react';
import { useParams } from 'react-router-dom';
import { App as AntApp, Button, Card, Descriptions, Form, Input, Select, Space, Tabs, Table, Tag, DatePicker, Upload, Popconfirm } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Dayjs } from 'dayjs';

 type Lead = { id: string; name?: string | null; email?: string | null; phone?: string | null; source?: string | null; requirements?: string | null; status: 'NEW'|'IN_PROGRESS'|'WON'|'LOST'; createdAt: string };
 type Showing = { id: string; date: string; premiseId?: string | null; agent?: string | null; comment?: string | null; status?: 'SCHEDULED'|'DONE'|'CANCELLED'; outcome?: string | null };
 type Attachment = { id: string; filename: string; originalName?: string | null; mimeType?: string | null; size?: number | null };
 type Premise = { id: string; code?: string | null; address: string };

const statusOptions = [
  { label: 'NEW', value: 'NEW' },
  { label: 'IN_PROGRESS', value: 'IN_PROGRESS' },
  { label: 'WON', value: 'WON' },
  { label: 'LOST', value: 'LOST' },
];

export const LeadDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { message } = AntApp.useApp();
  const qc = useQueryClient();

  const { data: lead, isLoading } = useQuery<Lead>({ queryKey: ['lead', id], queryFn: async ()=> (await api.get(`/leads/${id}`)).data });
  const { data: showings } = useQuery<Showing[]>({ queryKey: ['lead-showings', id], queryFn: async ()=> (await api.get(`/leads/${id}/showings`)).data });
  const { data: atts } = useQuery<Attachment[]>({ queryKey: ['lead-atts', id], queryFn: async ()=> (await api.get(`/leads/${id}/attachments`)).data });
  const { data: premises } = useQuery<Premise[]>({ queryKey: ['premises','all'], queryFn: async ()=> (await api.get('/premises')).data });

  const [infoForm] = Form.useForm();
  React.useEffect(()=>{ if (lead) infoForm.setFieldsValue(lead as any); }, [lead]);

  const updateLead = useMutation({
    mutationFn: async (values: any)=> (await api.patch(`/leads/${id}` , values)).data,
    onSuccess: async ()=> { await qc.invalidateQueries({ queryKey: ['lead', id] }); message.success('Сохранено'); },
  });

  const [showForm] = Form.useForm();
  const addShowing = useMutation({
    mutationFn: async (values: any)=> (await api.post(`/leads/${id}/showings`, { premiseId: values.premiseId, date: (values.date as Dayjs).toISOString(), agent: values.agent, comment: values.comment })).data,
    onSuccess: async ()=> { await qc.invalidateQueries({ queryKey: ['lead-showings', id] }); showForm.resetFields(); message.success('Показ добавлен'); },
  });

  const updateShowing = useMutation({
    mutationFn: async (body: { sid: string; status?: string; outcome?: string })=> (await api.patch(`/leads/${id}/showings/${body.sid}`, { status: body.status, outcome: body.outcome })).data,
    onSuccess: async ()=> { await qc.invalidateQueries({ queryKey: ['lead-showings', id] }); message.success('Обновлено'); },
  });

  const uploadProps = {
    name: 'file',
    customRequest: async (opts: any)=> {
      const form = new FormData();
      form.append('file', opts.file as File);
      await api.post(`/leads/${id}/attachments/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      await qc.invalidateQueries({ queryKey: ['lead-atts', id] });
      message.success('Файл загружен');
      opts.onSuccess?.({}, opts.file);
    },
    showUploadList: false,
  } as any;

  return (
    <Card loading={isLoading} title={`Лид ${lead?.name || lead?.email || lead?.phone || (lead?.id||'').slice(0,8)}`}>
      {lead && (
        <Tabs
          items={[
            {
              key: 'info', label: 'Инфо', children: (
                <>
                  <Descriptions column={2} bordered size="small" style={{ marginBottom: 12 }}>
                    <Descriptions.Item label="Статус"><Tag color={lead.status==='NEW'?'default':lead.status==='IN_PROGRESS'?'blue':lead.status==='WON'?'green':'red'}>{lead.status}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Создан">{String(lead.createdAt).replace('T',' ').slice(0,19)}</Descriptions.Item>
                  </Descriptions>

                  <Form form={infoForm} layout="vertical" onFinish={(v)=> updateLead.mutate(v)} style={{ maxWidth: 720 }}>
                    <Form.Item label="Имя" name="name"><Input /></Form.Item>
                    <Space.Compact block>
                      <Form.Item label="E-mail" name="email" style={{ width: '50%' }}><Input type="email" /></Form.Item>
                      <Form.Item label="Телефон" name="phone" style={{ width: '50%' }}><Input /></Form.Item>
                    </Space.Compact>
                    <Form.Item label="Источник" name="source"><Input /></Form.Item>
                    <Form.Item label="Требования" name="requirements"><Input.TextArea rows={3} /></Form.Item>
                    <Form.Item label="Статус" name="status"><Select options={statusOptions} /></Form.Item>
                    <Space>
                      <Button type="primary" htmlType="submit" loading={updateLead.isPending}>Сохранить</Button>
                    </Space>
                  </Form>
                </>
              )
            },
            {
              key: 'showings', label: 'Показы', children: (
                <>
                  <Table<Showing>
                    rowKey="id"
                    dataSource={showings || []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Дата', dataIndex: 'date', render: (v)=> String(v).replace('T',' ').slice(0,16) },
                      { title: 'Помещение', dataIndex: 'premiseId', render: (v)=> {
                        const p = (premises||[]).find(x=> x.id === v);
                        return p ? `${p.code ? p.code+' — ' : ''}${p.address}` : '';
                      } },
                      { title: 'Агент', dataIndex: 'agent' },
                      { title: 'Комментарий', dataIndex: 'comment' },
                      { title: 'Статус', dataIndex: 'status', render: (v)=> <Tag color={v==='SCHEDULED'?'blue':v==='DONE'?'green':'red'}>{v}</Tag> },
                      { title: 'Итог', dataIndex: 'outcome' },
                      { title: 'Действия', key: 'a', render: (_: any, r)=> (
                        <Space>
                          <Button size="small" onClick={()=> updateShowing.mutate({ sid: r.id, status: 'DONE' })}>Отметить как состоялся</Button>
                          <Button size="small" danger onClick={()=> updateShowing.mutate({ sid: r.id, status: 'CANCELLED' })}>Отменить</Button>
                        </Space>
                      )}
                    ]}
                  />

                  <Card size="small" title="Запланировать показ" style={{ marginTop: 12 }}>
                    <Form form={showForm} layout="vertical" onFinish={(v)=> addShowing.mutate(v)}>
                      <Space.Compact block>
                        <Form.Item label="Дата" name="date" rules={[{ required: true }]} style={{ width: '40%' }}>
                          <DatePicker showTime style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item label="Помещение" name="premiseId" style={{ width: '30%' }}>
                          <Select allowClear options={(premises||[]).map(p=>({ label: `${p.code ? p.code+' — ' : ''}${p.address}`, value: p.id }))} />
                        </Form.Item>
                        <Form.Item label="Агент" name="agent" style={{ width: '30%' }}>
                          <Input />
                        </Form.Item>
                      </Space.Compact>
                      <Form.Item label="Комментарий" name="comment"><Input.TextArea rows={2} /></Form.Item>
                      <Button type="primary" htmlType="submit" loading={addShowing.isPending}>Добавить</Button>
                    </Form>
                  </Card>
                </>
              )
            },
            {
              key: 'attachments', label: 'Вложения', children: (
                <>
                  <Space style={{ marginBottom: 12 }}>
                    <Upload {...uploadProps}><Button>Загрузить файл</Button></Upload>
                  </Space>
                  <Table<Attachment>
                    rowKey="id"
                    dataSource={atts || []}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'Файл', dataIndex: 'originalName', render: (v, r)=> v || r.filename },
                      { title: 'Тип', dataIndex: 'mimeType' },
                      { title: 'Размер', dataIndex: 'size' },
                      { title: 'Действия', key: 'a', render: (_: any, r)=> (
                        <Space>
                          <Button size="small" onClick={()=> window.open(`${api.defaults.baseURL}/leads/${id}/attachments/${r.id}/download`, '_blank')}>Скачать</Button>
                          <Popconfirm title="Удалить файл?" okText="Да" cancelText="Нет" onConfirm={async ()=> { await api.delete(`/leads/${id}/attachments/${r.id}`); await qc.invalidateQueries({ queryKey: ['lead-atts', id] }); }}>
                            <Button size="small" danger>Удалить</Button>
                          </Popconfirm>
                        </Space>
                      ) }
                    ]}
                  />
                </>
              )
            }
          ]}
        />
      )}
    </Card>
  );
};
