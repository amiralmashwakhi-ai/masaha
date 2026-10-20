import React, { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';
import * as data from '../data';
import { serviceName } from '../services';
import { OptionRow, H, P, useLang } from '../ui';

// Every chat the user is part of, across all jobs; tapping one opens the job with its chat.
export function Chats({ onOpen }: { onOpen: (jobId: string) => void }) {
  const { t } = useLang();
  const [chats, setChats] = useState<data.ChatSummary[] | null>(null);
  useEffect(() => { data.listMyChats().then(setChats).catch(() => setChats([])); }, []);
  return (
    <ScrollView>
      <H>{t('myChats')}</H>
      {chats === null && <P muted>{t('loading')}</P>}
      {chats?.length === 0 && <P muted>{t('noChats')}</P>}
      {chats?.map((c) => (
        <OptionRow key={c.id} icon="chat-outline" tone={c.unread ? 'accent' : 'primary'}
          title={serviceName(c, t)}
          subtitle={[c.otherName, t(`chatStatus.${c.status}`), c.unread ? `${c.unread} ${t('newMessages')}` : ''].filter(Boolean).join(' · ')}
          onPress={() => onOpen(c.jobId)} />
      ))}
    </ScrollView>
  );
}
