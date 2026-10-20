import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, IconName, useLang } from '../ui';

function Item({ icon, title, onPress, right, danger }: {
  icon: IconName; title: string; onPress?: () => void; right?: React.ReactNode; danger?: boolean;
}) {
  const { rtl } = useLang();
  const tint = danger ? colors.danger : colors.ink;
  return (
    <Pressable onPress={onPress}
      style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderBottomWidth: 1, borderColor: colors.line }}>
      <MaterialCommunityIcons name={icon} size={21} color={danger ? colors.danger : colors.primary} />
      <Text style={{ flex: 1, fontSize: 14, color: tint, textAlign: rtl ? 'right' : 'left' }}>{title}</Text>
      {right}
    </Pressable>
  );
}

// The ☰ menu: account items when signed in, plus night mode and language for everyone.
export function Menu({ open, onClose, signedIn, onProfile, onHistory, onSettings, onOperator, onSignOut }: {
  open: boolean; onClose: () => void; signedIn: boolean;
  onProfile: () => void; onHistory: () => void; onSettings: () => void; onOperator?: () => void; onSignOut: () => void;
}) {
  const { t, rtl, dark, toggleDark, toggleLang } = useLang();
  const insets = useSafeAreaInsets();
  const go = (fn: () => void) => () => { onClose(); fn(); };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(20,30,30,0.35)' }}>
        <Pressable onPress={() => {}} style={{
          position: 'absolute', top: insets.top + 8, [rtl ? 'left' : 'right']: 12, width: 260,
          backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 4,
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 14, elevation: 8,
        }}>
          {signedIn && (
            <>
              <Item icon="account-circle-outline" title={t('myProfile')} onPress={go(onProfile)} />
              <Item icon="history" title={t('history')} onPress={go(onHistory)} />
              <Item icon="cog-outline" title={t('settings')} onPress={go(onSettings)} />
              {onOperator && <Item icon="shield-account-outline" title={t('operatorPanel')} onPress={go(onOperator)} />}
            </>
          )}
          <Item icon="weather-night" title={t('nightMode')} onPress={toggleDark}
            right={<Switch value={dark} onValueChange={toggleDark} trackColor={{ true: colors.primary, false: colors.line }} />} />
          <Item icon="translate" title={`${t('language')}: ${t('switchLang')}`} onPress={go(toggleLang)} />
          {signedIn && <Item icon="logout" title={t('signOut')} danger onPress={go(onSignOut)} />}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
