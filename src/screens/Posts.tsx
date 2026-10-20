import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import * as data from '../data';
import { GOVERNORATES, SERVICES } from '../services';
import { Attachment, Role, ServiceId, ServicePost } from '../types';
import { Button, Card, colors, Field, H, IconCircle, OptionRow, P, useLang } from '../ui';

function Attachments({ items }: { items: Attachment[] }) {
  const { rtl } = useLang();
  const images = items.filter((a) => a.kind === 'image');
  const docs = items.filter((a) => a.kind === 'document');
  return (
    <>
      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
          {images.map((a) => (
            <Pressable key={a.url} onPress={() => Linking.openURL(a.url)}>
              <Image source={{ uri: a.url }} style={{ width: 120, height: 90, borderRadius: 12, marginEnd: 8, backgroundColor: colors.line }} />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {docs.map((a) => (
        <Pressable key={a.url} onPress={() => Linking.openURL(a.url)}
          style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <MaterialCommunityIcons name="file-document-outline" size={18} color={colors.primary} />
          <Text style={{ color: colors.primary, fontSize: 13, flexShrink: 1 }} numberOfLines={1}>{a.name}</Text>
        </Pressable>
      ))}
    </>
  );
}

export function PostCard({ post, role, mine, onProvider, onRequest, onChanged }: {
  post: ServicePost; role: Role; mine?: boolean;
  onProvider?: (id: string) => void; onRequest?: (service: ServiceId) => void; onChanged?: () => void;
}) {
  const { t, rtl } = useLang();
  const icon = SERVICES.find((x) => x.id === post.service)?.icon ?? 'map-marker';
  const act = (fn: () => Promise<unknown>) => async () => { try { await fn(); } finally { onChanged?.(); } };
  return (
    <Card>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10 }}>
        <IconCircle name={icon} />
        <View style={{ flex: 1 }}>
          <P>{post.title}</P>
          <P muted small>
            {[t(`service.${post.service}`), post.governorate && t(`gov.${post.governorate}`), post.createdAt.slice(0, 10)]
              .filter(Boolean).join(' · ')}
          </P>
        </View>
      </View>
      {!!post.body && <View style={{ marginTop: 8 }}><P>{post.body}</P></View>}
      {post.priceFromJod != null && <P muted small>{`${t('priceFrom')} ${post.priceFromJod} ${t('jod')}`}</P>}
      <Attachments items={post.attachments} />
      {!mine && onProvider && (
        <Button title={`${t('viewProfile')}: ${post.providerName}`} icon="account-outline" secondary onPress={() => onProvider(post.providerId)} />
      )}
      {!mine && role === 'customer' && onRequest && (
        <Button title={t('requestThisService')} icon="plus" onPress={() => onRequest(post.service)} />
      )}
      {mine && (
        <>
          {!post.active && <P muted small>{t('postHidden')}</P>}
          <Button title={post.active ? t('hidePost') : t('showPost')} secondary onPress={act(() => data.setPostActive(post.id, !post.active))} />
          <Button title={t('deletePost')} secondary onPress={act(() => data.deletePost(post.id))} />
        </>
      )}
    </Card>
  );
}

// Everyone can browse providers' offers; customers can turn one into a request.
export function PostFeed({ role, onProvider, onRequest, onNewPost, onBack }: {
  role: Role; onProvider: (id: string) => void; onRequest: (service: ServiceId) => void; onNewPost?: () => void; onBack: () => void;
}) {
  const { t } = useLang();
  const [posts, setPosts] = useState<ServicePost[] | null>(null);
  const [filter, setFilter] = useState<ServiceId | null>(null);
  useEffect(() => { data.listPosts().then(setPosts).catch(() => setPosts([])); }, []);
  const shown = (posts ?? []).filter((p) => !filter || p.service === filter);
  return (
    <ScrollView>
      <H>{t('browseServices')}</H>
      {onNewPost && <Button title={t('newPost')} icon="plus" onPress={onNewPost} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
        {[null, ...SERVICES.map((x) => x.id)].map((id) => (
          <Pressable key={id ?? 'all'} onPress={() => setFilter(id)}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginEnd: 6,
              backgroundColor: filter === id ? colors.primary : colors.primarySoft }}>
            <Text style={{ fontSize: 12, color: filter === id ? colors.primaryInk : colors.primary }}>
              {id ? t(`service.${id}`) : t('all')}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {posts === null && <P muted>{t('loading')}</P>}
      {posts !== null && shown.length === 0 && <P muted>{t('noPosts')}</P>}
      {shown.map((p) => <PostCard key={p.id} post={p} role={role} onProvider={onProvider} onRequest={onRequest} />)}
      <Button title={t('back')} onPress={onBack} secondary />
    </ScrollView>
  );
}

const DOC_TYPES = [
  'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export function PostEditor({ userId, onDone, onBack }: { userId: string; onDone: () => void; onBack: () => void }) {
  const { t } = useLang();
  const [service, setService] = useState<ServiceId | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [price, setPrice] = useState('');
  const [gov, setGov] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState('');

  const add = async (pick: () => Promise<{ uri: string; name: string; mime: string }[]>) => {
    if (files.length >= 10) { setInfo(t('maxFiles')); return; }
    try {
      const picked = await pick();
      if (!picked.length) return;
      setBusy(true); setInfo(t('uploading'));
      const uploaded = await Promise.all(picked.slice(0, 10 - files.length).map((f) => data.uploadPostFile(userId, f.uri, f.name, f.mime)));
      setFiles((cur) => [...cur, ...uploaded]); setInfo('');
    } catch { setInfo(t('uploadFailed')); } finally { setBusy(false); }
  };
  const pickPhotos = () => add(async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.7, selectionLimit: 10 });
    if (r.canceled) return [];
    return r.assets.map((a, i) => ({ uri: a.uri, name: a.fileName ?? `photo-${i + 1}.jpg`, mime: a.mimeType ?? 'image/jpeg' }));
  });
  const pickDocs = () => add(async () => {
    const r = await DocumentPicker.getDocumentAsync({ type: DOC_TYPES, multiple: true, copyToCacheDirectory: true });
    if (r.canceled) return [];
    return r.assets.map((a) => ({ uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf' }));
  });

  if (!service) {
    return (
      <ScrollView>
        <H>{t('newPost')}</H>
        <P muted small>{t('pickPostService')}</P>
        {SERVICES.map((sv) => <OptionRow key={sv.id} icon={sv.icon} title={t(`service.${sv.id}`)} onPress={() => setService(sv.id)} />)}
        <Button title={t('back')} onPress={onBack} secondary />
      </ScrollView>
    );
  }

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{`${t('newPost')}: ${t(`service.${service}`)}`}</H>
      <Field label={t('postTitle')} value={title} onChange={(v) => setTitle(data.stripDigits(v))} />
      <Field label={t('postBody')} value={body} onChange={(v) => setBody(data.stripDigits(v))} multiline />
      <P muted small>{t('postNoNumbers')}</P>
      <Field label={`${t('priceFrom')} (${t('jod')})`} value={price} onChange={setPrice} numeric />
      <P muted small>{t('governorate')}</P>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        {GOVERNORATES.map((g) => (
          <Pressable key={g} onPress={() => setGov(gov === g ? '' : g)}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, marginEnd: 6, backgroundColor: gov === g ? colors.primary : colors.primarySoft }}>
            <Text style={{ fontSize: 12, color: gov === g ? colors.primaryInk : colors.primary }}>{t(`gov.${g}`)}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <Card>
        <P>{t('attachments')}</P>
        <Attachments items={files} />
        {files.length > 0 && <Button title={t('removeLastFile')} secondary onPress={() => setFiles(files.slice(0, -1))} />}
        <Button title={t('addPhotos')} icon="image-plus" secondary disabled={busy} onPress={pickPhotos} />
        <Button title={t('addDocuments')} icon="file-plus-outline" secondary disabled={busy} onPress={pickDocs} />
      </Card>
      {!!info && <P small>{info}</P>}
      <Button title={t('publishPost')} icon="send" disabled={busy || !title.trim()} onPress={async () => {
        setBusy(true);
        try {
          const n = Number(price);
          await data.createPost(userId, { service, title, body, priceFromJod: price && n >= 0 ? n : undefined, governorate: gov, attachments: files });
          onDone();
        } catch { setInfo(t('somethingWrong')); } finally { setBusy(false); }
      }} />
      <Button title={t('back')} onPress={() => setService(null)} secondary />
    </ScrollView>
  );
}
