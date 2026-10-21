import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, View } from 'react-native';
import { NextStep } from '../nextStep';
import { Job, JOB_STAGES } from '../types';
import { Button, Card, colors, useLang } from '../ui';

// The big "what now" card at the top of a job: your turn (sand) or waiting for the other side (teal).
export function NextStepCard({ step, actionTitle, onAction }: { step: NextStep; actionTitle?: string; onAction?: () => void }) {
  const { t, rtl } = useLang();
  const mine = step.turn === 'you';
  const bg = mine ? colors.accentSoft : colors.primarySoft;
  const fg = mine ? colors.accentInk : colors.primary;
  const align = { textAlign: rtl ? 'right' : 'left' } as const;
  return (
    <View style={{ backgroundColor: bg, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: mine ? colors.accent : colors.primarySoft }}>
      <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: fg, alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={step.icon} size={30} color={colors.card} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: fg, letterSpacing: 0.2, ...align }}>
            {step.turn === 'you' ? t('turn.you') : step.turn === 'other' ? t('turn.other') : t('turn.none')}
          </Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: colors.ink, lineHeight: 26, ...align }}>{t(`${step.key}`)}</Text>
          <Text style={{ fontSize: 14, color: colors.ink, opacity: 0.8, lineHeight: 21, ...align }}>{t(`${step.key}.hint`)}</Text>
        </View>
      </View>
      {actionTitle && onAction && <View style={{ marginTop: 10 }}><Button title={actionTitle} onPress={onAction} /></View>}
    </View>
  );
}

// All eight stages down the side: done ✓, the current one highlighted with what it means, the rest faded.
export function StageTimeline({ job }: { job: Job }) {
  const { t, rtl } = useLang();
  const current = JOB_STAGES.indexOf(job.stage);
  const align = { textAlign: rtl ? 'right' : 'left' } as const;
  if (current < 0) return null;
  return (
    <Card>
      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.ink, marginBottom: 10, ...align }}>{t('stagesTitle')}</Text>
      {JOB_STAGES.map((st, i) => {
        const done = i < current || job.stage === 'done';
        const now = i === current && job.stage !== 'done';
        const dot = done ? colors.primary : now ? colors.accent : colors.line;
        return (
          <View key={st} style={{ flexDirection: rtl ? 'row-reverse' : 'row', gap: 12 }}>
            <View style={{ alignItems: 'center', width: 28 }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: dot, alignItems: 'center', justifyContent: 'center' }}>
                {done ? <MaterialCommunityIcons name="check" size={17} color={colors.card} />
                  : <Text style={{ color: now ? '#fff' : colors.muted, fontSize: 13, fontWeight: '800' }}>{i + 1}</Text>}
              </View>
              {i < JOB_STAGES.length - 1 && <View style={{ width: 2, flex: 1, minHeight: 14, backgroundColor: done ? colors.primary : colors.line }} />}
            </View>
            <View style={{ flex: 1, paddingBottom: 12, paddingTop: 3 }}>
              <Text style={{ fontSize: 15, fontWeight: now ? '800' : '600', color: done || now ? colors.ink : colors.muted, ...align }}>{t(`stage.${st}`)}</Text>
              {now && <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20, marginTop: 2, ...align }}>{t(`stageHint.${st}`)}</Text>}
            </View>
          </View>
        );
      })}
    </Card>
  );
}
