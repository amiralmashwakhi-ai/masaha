import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import * as data from '../data';
import { serviceName, SERVICES } from '../services';
import { Job, Role, ServicePost } from '../types';
import { Button, Card, colors, H, IconCircle, P, useLang } from '../ui';

type Item =
  | { kind: 'job'; at: string; job: Job }
  | { kind: 'post'; at: string; post: ServicePost };

// One timeline of everything the user did: requests (customer), quotes and won jobs (provider), and posts.
export function History({ role, userId, jobs, onOpenJob, onBack }: {
  role: Role; userId: string; jobs: Job[]; onOpenJob: (id: string) => void; onBack: () => void;
}) {
  const { t, rtl } = useLang();
  const [posts, setPosts] = useState<ServicePost[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const loadPosts = () => { if (role === 'provider') data.listPosts({ providerId: userId }).then(setPosts).catch(() => {}); };
  useEffect(loadPosts, [role, userId]);

  const myJobs = role === 'customer' ? jobs : jobs.filter((j) => j.quotes.some((q) => q.providerId === userId));
  const items: Item[] = [
    ...myJobs.map((job): Item => ({ kind: 'job', at: job.createdAt, job })),
    ...posts.map((post): Item => ({ kind: 'post', at: post.createdAt, post })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const jobLabel = (j: Job) => {
    if (role === 'customer') return t('historyRequest');
    if (j.providerId === userId) return t('historyWon');
    if (j.providerId) return t('historyLost');
    return t('historyQuoted');
  };

  return (
    <ScrollView>
      <H>{t('history')}</H>
      {items.length === 0 && <P muted>{t('noHistory')}</P>}
      {items.map((it) => {
        const service = it.kind === 'job' ? it.job.service : it.post.service;
        const icon = SERVICES.find((x) => x.id === service)?.icon ?? 'map-marker';
        return (
          <Card key={`${it.kind}-${it.kind === 'job' ? it.job.id : it.post.id}`}
            onPress={it.kind === 'job' ? () => onOpenJob(it.job.id) : undefined}>
            <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
              <IconCircle name={icon} tone={it.kind === 'post' ? 'accent' : 'primary'} />
              <View style={{ flex: 1 }}>
                <P small muted>{`${it.at.slice(0, 10)} · ${it.kind === 'job' ? jobLabel(it.job) : t('historyPost')}`}</P>
                <P>{it.kind === 'job' ? serviceName(it.job, t) : it.post.title}</P>
                <P small muted>
                  {it.kind === 'job'
                    ? t(`stage.${it.job.stage}`)
                    : `${t(`service.${service}`)}${it.post.active ? '' : ` · ${t('postHidden')}`}`}
                </P>
              </View>
            </View>
            {it.kind === 'post' && (confirm === it.post.id
              ? <>
                  <P>{t('deletePostConfirm')}</P>
                  <Button title={t('yesDelete')} onPress={async () => { await data.deletePost(it.post.id).catch(() => {}); setConfirm(null); loadPosts(); }} />
                  <Button title={t('back')} secondary onPress={() => setConfirm(null)} />
                </>
              : <Button title={t('deletePost')} icon="delete-outline" secondary onPress={() => setConfirm(it.post.id)} />)}
          </Card>
        );
      })}
      <View style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }} />
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}
