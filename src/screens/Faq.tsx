import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import faq from '../faq.json';
import { BackButton, Card, Chips, colors, H, matches, P, SearchBox, useLang } from '../ui';

interface FaqItem { q: string; a: string; source: string; sourceName: string }
interface FaqCategory { id: string; title: string; items: FaqItem[] }
const categories = faq.categories as FaqCategory[];

// Common questions about land, survey and building-permit transactions, taken from official
// government sites only. The same faq.json feeds website/faq.html.
export function Faq({ onBack }: { onBack: () => void }) {
  const { t, rtl } = useLang();
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const shown = categories
    .filter((c) => !cat || c.id === cat)
    .map((c) => ({ ...c, items: c.items.filter((i) => matches(query, i.q, i.a, c.title)) }))
    .filter((c) => c.items.length);
  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      <H>{t('faq')}</H>
      <P muted small>{t('faqHint')}</P>
      <SearchBox value={query} onChange={setQuery} placeholder={t('faqSearch')} />
      <Chips value={cat} onChange={setCat} options={[{ id: null, title: t('all') }, ...categories.map((c) => ({ id: c.id, title: c.title }))]} />
      {shown.length === 0 && <P muted>{t('noResults')}</P>}
      {shown.map((c) => (
        <View key={c.id}>
          {!cat && <P>{c.title}</P>}
          {c.items.map((i) => {
            const key = `${c.id}:${i.q}`;
            const isOpen = open === key || !!query.trim();
            return (
              <Card key={key} onPress={() => setOpen(open === key ? null : key)}>
                <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700', textAlign: rtl ? 'right' : 'left' }}>{i.q}</Text>
                  <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} />
                </View>
                {isOpen && (
                  <View style={{ marginTop: 8, gap: 6 }}>
                    <P>{i.a}</P>
                    <Pressable onPress={() => Linking.openURL(i.source)} hitSlop={6}>
                      <Text style={{ color: colors.primary, fontSize: 13, textAlign: rtl ? 'right' : 'left' }}>{`${t('faqSource')}: ${i.sourceName}`}</Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            );
          })}
        </View>
      ))}
      <P muted small>{t('faqDisclaimer')}</P>
      <BackButton onPress={onBack} />
    </ScrollView>
  );
}
