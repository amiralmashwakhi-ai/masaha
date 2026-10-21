import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Role } from '../types';
import { BackButton, Card, Chips, colors, H, IconName, P, useLang } from '../ui';

const STEPS: Record<Role, { icon: IconName; key: string }[]> = {
  customer: [
    { icon: 'clipboard-text-outline', key: 'guide.c1' }, { icon: 'scale-balance', key: 'guide.c2' },
    { icon: 'draw-pen', key: 'guide.c3' }, { icon: 'shield-lock-outline', key: 'guide.c4' },
    { icon: 'map-marker-radius-outline', key: 'guide.c5' }, { icon: 'file-check-outline', key: 'guide.c6' },
  ],
  provider: [
    { icon: 'card-account-details-outline', key: 'guide.p1' }, { icon: 'briefcase-search-outline', key: 'guide.p2' },
    { icon: 'draw-pen', key: 'guide.p3' }, { icon: 'map-marker-radius-outline', key: 'guide.p4' },
    { icon: 'file-upload-outline', key: 'guide.p5' }, { icon: 'cash-check', key: 'guide.p6' },
  ],
};
const RULES: { icon: IconName; key: string }[] = [
  { icon: 'shield-lock-outline', key: 'rule.escrow' }, { icon: 'phone-lock-outline', key: 'rule.phone' },
  { icon: 'numeric-off', key: 'rule.digits' }, { icon: 'timer-outline', key: 'rule.autoRelease' },
  { icon: 'alert-octagon-outline', key: 'rule.dispute' }, { icon: 'bank-outline', key: 'rule.govFees' },
];

// How Masaha works, step by step for each side, plus the rules that protect both.
export function Guide({ role, onBack }: { role: Role; onBack: () => void }) {
  const { t, rtl } = useLang();
  const [who, setWho] = useState<Role>(role);
  const align = { textAlign: rtl ? 'right' : 'left' } as const;
  return (
    <ScrollView>
      <H>{t('guide')}</H>
      <P muted>{t('guideIntro')}</P>
      <Chips value={who} onChange={setWho} options={[{ id: 'customer', title: t('guide.forCustomer') }, { id: 'provider', title: t('guide.forProvider') }]} />
      {STEPS[who].map((s, i) => (
        <View key={s.key} style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 14, marginBottom: 4 }}>
          <View style={{ alignItems: 'center', width: 46 }}>
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <MaterialCommunityIcons name={s.icon} size={24} color={colors.primaryInk} />
            </View>
            {i < STEPS[who].length - 1 && <View style={{ width: 2, flex: 1, minHeight: 12, backgroundColor: colors.primarySoft }} />}
          </View>
          <View style={{ flex: 1, paddingBottom: 14, paddingTop: 2 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.ink, ...align }}>{`${i + 1}. ${t(s.key)}`}</Text>
            <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 21, marginTop: 2, ...align }}>{t(`${s.key}.hint`)}</Text>
          </View>
        </View>
      ))}
      <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, marginTop: 8, marginBottom: 10, ...align }}>{t('rulesTitle')}</Text>
      {RULES.map((r) => (
        <Card key={r.key}>
          <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 12, alignItems: 'center' }}>
            <MaterialCommunityIcons name={r.icon} size={28} color={colors.accentInk} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: colors.ink, ...align }}>{t(r.key)}</Text>
              <Text style={{ fontSize: 14, color: colors.muted, lineHeight: 21, ...align }}>{t(`${r.key}.hint`)}</Text>
            </View>
          </View>
        </Card>
      ))}
      <BackButton onPress={onBack} />
    </ScrollView>
  );
}
