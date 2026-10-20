import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../supabase';
import { colors, useLang } from '../ui';

interface Turn { role: 'user' | 'assistant'; content: string }

async function ask(history: Turn[]): Promise<{ reply?: string; error?: string }> {
  const { data, error } = await supabase.functions.invoke('assistant', { body: { messages: history } });
  if (!error) return data;
  // Non-2xx responses still carry our { error } body.
  try { return await (error as { context?: Response }).context!.json(); } catch { return { error: 'server' }; }
}

// Floating bubble in the bottom corner; opens a chat with the Masaha assistant.
export function AssistantBubble() {
  const { t, rtl } = useLang();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const history: Turn[] = [...turns, { role: 'user', content: text }];
    setTurns(history); setDraft(''); setBusy(true);
    const res = await ask(history).catch(() => ({ error: 'server' } as { reply?: string; error?: string }));
    const reply = res.reply || t(`ai.err.${res.error ?? 'server'}`);
    setTurns([...history, { role: 'assistant', content: reply }]);
    setBusy(false);
  };

  const side = rtl ? { left: 18 } : { right: 18 };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} accessibilityLabel={t('ai.title')}
        style={{ position: 'absolute', bottom: insets.bottom + 18, ...side, width: 56, height: 56, borderRadius: 28,
          backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
          shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 6 }}>
        <MaterialCommunityIcons name="robot-happy-outline" size={28} color={colors.primaryInk} />
      </Pressable>
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,30,30,0.35)' }}>
          <View style={{ height: '80%', backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: insets.bottom + 8 }}>
            <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 10, padding: 14, borderBottomWidth: 1, borderColor: colors.line }}>
              <MaterialCommunityIcons name="robot-happy-outline" size={22} color={colors.primary} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink, textAlign: rtl ? 'right' : 'left' }}>{t('ai.title')}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
              </Pressable>
            </View>
            <ScrollView ref={scroll} contentContainerStyle={{ padding: 14 }} onContentSizeChange={() => scroll.current?.scrollToEnd()}>
              {turns.length === 0 && (
                <Text style={{ color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: rtl ? 'right' : 'left' }}>{t('ai.hello')}</Text>
              )}
              {turns.map((m, i) => {
                const mine = m.role === 'user';
                return (
                  <View key={i} style={{ alignItems: mine !== rtl ? 'flex-end' : 'flex-start', marginVertical: 4 }}>
                    <View style={{ maxWidth: '86%', backgroundColor: mine ? colors.primary : colors.card, borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12 }}>
                      <Text style={{ color: mine ? colors.primaryInk : colors.ink, fontSize: 14, lineHeight: 21, textAlign: rtl ? 'right' : 'left' }}>{m.content}</Text>
                    </View>
                  </View>
                );
              })}
              {busy && <ActivityIndicator color={colors.primary} style={{ marginTop: 8 }} />}
            </ScrollView>
            <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12 }}>
              <TextInput value={draft} onChangeText={setDraft} placeholder={t('ai.placeholder')} placeholderTextColor={colors.muted} multiline
                style={{ flex: 1, maxHeight: 110, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 14,
                  paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.ink, textAlign: rtl ? 'right' : 'left' }} />
              <Pressable onPress={send} disabled={busy || !draft.trim()}
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: busy || !draft.trim() ? 0.5 : 1 }}>
                <MaterialCommunityIcons name="send" size={20} color={colors.primaryInk} style={rtl ? { transform: [{ scaleX: -1 }] } : undefined} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
