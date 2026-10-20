import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import * as data from '../data';
import { Job, Provider, Role } from '../types';
import { Button, Card, colors, Field, IconCircle, P, useLang } from '../ui';
import { ReportBlock } from './Safety';

const POLL_MS = 4000;

function Conversation({ chatId, userId, otherId }: { chatId: string; userId: string; otherId: string }) {
  const { t, rtl } = useLang();
  const [messages, setMessages] = useState<data.ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const load = useCallback(() => { data.listMessages(chatId).then(setMessages).catch(() => {}); }, [chatId]);
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const send = async () => {
    if (!draft.trim()) return;
    try { await data.sendMessage(chatId, userId, draft); setDraft(''); load(); } catch { /* empty after removing numbers */ }
  };

  return (
    <View style={{ marginTop: 8 }}>
      {messages.length === 0 && <P muted small>{t('noMessages')}</P>}
      {messages.map((m) => {
        const mine = m.senderId === userId;
        const right = mine !== rtl;
        return (
          <View key={m.id} style={{ alignItems: right ? 'flex-end' : 'flex-start', marginVertical: 3 }}>
            <View style={{ maxWidth: '82%', backgroundColor: mine ? colors.primary : colors.primarySoft, borderRadius: 14, paddingVertical: 7, paddingHorizontal: 11 }}>
              <Text style={{ color: mine ? colors.primaryInk : colors.ink, fontSize: 14, textAlign: rtl ? 'right' : 'left' }}>{m.body}</Text>
              <Text style={{ color: mine ? '#D6E6E6' : colors.muted, fontSize: 10, marginTop: 2, textAlign: rtl ? 'right' : 'left' }}>
                {m.at.slice(11, 16)}
              </Text>
            </View>
          </View>
        );
      })}
      <Field label={t('writeMessage')} value={draft} onChange={(v) => setDraft(data.stripDigits(v))} multiline />
      <P muted small>{t('noNumbersHint')}</P>
      <Button title={t('send')} icon="send" onPress={send} disabled={!draft.trim()} />
      <ReportBlock reporterId={userId} userId={otherId} chatId={chatId} canBlock />
    </View>
  );
}

// Chat requests for one job: the customer with each provider who quoted, or the provider with the customer.
export function ChatCard({ job, role, userId, providers }: { job: Job; role: Role; userId: string; providers: Provider[] }) {
  const { t, rtl } = useLang();
  const [chats, setChats] = useState<data.Chat[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => { data.listChats(job.id).then(setChats).catch(() => setError(t('somethingWrong'))); }, [job.id]);
  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS * 3);
    return () => clearInterval(timer);
  }, [load]);

  const act = (fn: () => Promise<unknown>) => async () => {
    try { await fn(); setError(''); } catch { setError(t('somethingWrong')); }
    load();
  };

  const providerIds = role === 'provider'
    ? [userId]
    : job.providerId
      ? [job.providerId]
      : [...new Set([...job.quotes.map((q) => q.providerId), ...chats.map((c) => c.providerId)])];
  if (providerIds.length === 0) return null;

  return (
    <Card>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
        <IconCircle name="chat-processing-outline" size={34} />
        <P>{t('chat')}</P>
      </View>
      {providerIds.map((pid) => {
        const chat = chats.find((c) => c.providerId === pid);
        const name = role === 'provider' ? t('customer') : providers.find((p) => p.id === pid)?.name || chat?.providerName || t('provider');
        const askedByMe = chat?.requestedBy === userId;
        return (
          <View key={pid} style={{ borderTopWidth: 1, borderColor: colors.line, paddingTop: 8, marginTop: 8 }}>
            <P>{name}</P>
            {(!chat || chat.status === 'declined') && (
              <>
                {chat && <P muted small>{askedByMe ? t('chatDeclined') : t('chatYouDeclined')}</P>}
                <Button title={t('requestChat')} icon="chat-plus-outline" secondary onPress={act(() => data.requestChat(job.id, pid))} />
              </>
            )}
            {chat?.status === 'pending' && askedByMe && <P muted small>{t('chatRequestSent')}</P>}
            {chat?.status === 'pending' && !askedByMe && (
              <>
                <P muted small>{t('chatRequestReceived')}</P>
                <Button title={t('acceptChat')} icon="check" onPress={act(() => data.respondChat(chat.id, true))} />
                <Button title={t('declineChat')} secondary onPress={act(() => data.respondChat(chat.id, false))} />
              </>
            )}
            {chat?.status === 'accepted' && (
              open === chat.id
                ? <>
                    <Conversation chatId={chat.id} userId={userId} otherId={role === 'provider' ? job.customerId : pid} />
                    <Button title={t('closeChat')} secondary onPress={() => setOpen(null)} />
                  </>
                : <Button title={t('openChat')} icon="chat-outline" onPress={() => setOpen(chat.id)} />
            )}
          </View>
        );
      })}
      {!!error && <P small>{error}</P>}
    </Card>
  );
}
