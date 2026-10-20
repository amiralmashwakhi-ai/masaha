import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Role } from '../types';
import { colors, IconName, useLang } from '../ui';

export type Tab = 'home' | 'chats' | 'add' | 'mine' | 'account';

function TabItem({ icon, title, active, badge, onPress }: { icon: IconName; title: string; active: boolean; badge?: number; onPress: () => void }) {
  const tint = active ? colors.primary : colors.muted;
  return (
    <Pressable onPress={onPress} style={{ flex: 1, alignItems: 'center', paddingTop: 8, paddingBottom: 6 }}>
      <View>
        <MaterialCommunityIcons name={icon} size={25} color={tint} />
        {!!badge && (
          <View style={{ position: 'absolute', top: -5, right: -10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
            backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 11, marginTop: 2, color: tint, fontWeight: active ? '700' : '400' }}>{title}</Text>
    </Pressable>
  );
}

// Fixed bar at the bottom: the middle button adds a service (surveyor) or a request (customer).
export function TabBar({ role, active, chatUnread, onTab }: { role: Role; active?: Tab; chatUnread: number; onTab: (tab: Tab) => void }) {
  const { t, rtl } = useLang();
  const provider = role === 'provider';
  return (
    <View style={{ flexDirection: rtl ? 'row-reverse' : 'row', alignItems: 'flex-end', backgroundColor: colors.card,
      borderTopWidth: 1, borderColor: colors.line, paddingHorizontal: 4 }}>
      <TabItem icon="home-variant" title={t('home')} active={active === 'home'} onPress={() => onTab('home')} />
      <TabItem icon="chat-processing" title={t('myChats')} active={active === 'chats'} badge={chatUnread} onPress={() => onTab('chats')} />
      <Pressable onPress={() => onTab('add')} style={{ flex: 1.2, alignItems: 'center', paddingBottom: 6 }}>
        <View style={{ width: 58, height: 58, borderRadius: 29, marginTop: -22, backgroundColor: colors.accent,
          alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: colors.card, elevation: 4,
          shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 }}>
          <MaterialCommunityIcons name="plus" size={30} color="#fff" />
        </View>
        <Text style={{ fontSize: 11, marginTop: 2, color: colors.ink, fontWeight: '700' }}>{provider ? t('addService') : t('addRequest')}</Text>
      </Pressable>
      <TabItem icon={provider ? 'briefcase-outline' : 'clipboard-list-outline'} title={provider ? t('myServices') : t('myRequests')}
        active={active === 'mine'} onPress={() => onTab('mine')} />
      <TabItem icon="account-circle" title={t('myAccount')} active={active === 'account'} onPress={() => onTab('account')} />
    </View>
  );
}
