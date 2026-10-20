import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { loadProfile, Profile, signOut, useSession } from './src/auth';
import * as data from './src/data';
import { applyDirection, makeT } from './src/i18n';
import { EditProvider } from './src/screens/EditProvider';
import { Home } from './src/screens/Home';
import { Settings } from './src/screens/Settings';
import { JobActions, JobDetail } from './src/screens/JobDetail';
import { JobList } from './src/screens/JobList';
import { ProviderProfile } from './src/screens/ProviderProfile';
import { RequestWizard } from './src/screens/RequestWizard';
import { CreateProfile, SignIn } from './src/screens/SignIn';
import { Job, Lang, Provider, Role } from './src/types';
import { colors, Header, LangCtx, P } from './src/ui';

type Screen =
  | { name: 'home' } | { name: 'jobs' } | { name: 'wizard' } | { name: 'editProvider' } | { name: 'settings' }
  | { name: 'job'; id: string } | { name: 'profile'; id: string; back: Screen };

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [role, setRole] = useState<Role>('customer');
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');

  const { session, loading } = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const userId = session?.user.id;
  const refreshProfile = () => { if (userId) loadProfile(userId).then(setProfile); };
  useEffect(() => { setProfile(undefined); refreshProfile(); }, [userId]);
  useEffect(() => { if (profile && profile.role !== 'admin') setRole(profile.role); }, [profile]);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    applyDirection(next);
    setLang(next);
  };
  const ctx = useMemo(() => ({ lang, t: makeT(lang), rtl: lang === 'ar', toggleLang }), [lang]);

  const refresh = useCallback(async () => {
    if (!userId || !profile) return;
    try {
      const list = await data.listJobs(role, userId);
      setJobs(list);
      const ids = new Set(list.flatMap((j) => j.quotes.map((q) => q.providerId)));
      if (role === 'provider') ids.add(userId);
      setProviders(await data.loadProviders([...ids]));
      setError('');
    } catch {
      setError(ctx.t('somethingWrong'));
    }
  }, [userId, profile, role, ctx]);
  useEffect(() => { refresh(); }, [refresh]);

  // Runs a database action, then reloads so the screen always shows the stored state.
  const run = (fn: () => Promise<unknown>) => async () => {
    try { await fn(); } catch { setError(ctx.t('somethingWrong')); }
    await refresh();
  };

  const actions: JobActions = {
    sendQuote: (id, priceJod, days, scope) => { if (userId) run(() => data.sendQuote(id, userId, priceJod, days, scope))(); },
    acceptQuote: (_id, quoteId) => run(() => data.acceptQuote(quoteId))(),
    sign: (id) => run(() => data.signAgreement(id))(),
    payEscrow: (id) => run(() => data.payEscrow(id))(),
    advance: (id) => run(() => data.advanceStage(id))(),
    release: (id, key) => run(() => data.releaseMilestone(id, key))(),
    review: (id, by, stars, text) => {
      const job = jobs.find((j) => j.id === id);
      if (job && userId && profile) run(() => data.leaveReview(job, userId, by, profile.full_name, stars, text))();
    },
  };

  const current = screen.name === 'job' ? jobs.find((j) => j.id === screen.id) : undefined;
  const viewedProvider = screen.name === 'profile' ? providers.find((p) => p.id === screen.id) : undefined;
  const me = providers.find((p) => p.id === userId);
  const ready = session && profile;

  return (
    <LangCtx.Provider value={ctx}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          <Header />
          {!loading && !session && <SignIn />}
          {session && profile === undefined && <P muted>{ctx.t('loading')}</P>}
          {session && profile === null && userId && (
            <CreateProfile userId={userId} defaultName={session.user.user_metadata?.full_name} onDone={refreshProfile} />
          )}
          {!!error && ready && <P>{error}</P>}
          {ready && screen.name === 'home' && (
            <Home
              role={role}
              name={profile.full_name}
              coverUrl={profile.cover_url}
              onJobs={() => setScreen({ name: 'jobs' })}
              onNew={() => setScreen({ name: 'wizard' })}
              onEditProfile={role === 'provider' && me ? () => setScreen({ name: 'editProvider' }) : undefined}
              onSettings={() => setScreen({ name: 'settings' })}
            />
          )}
          {ready && screen.name === 'settings' && (
            <Settings
              profile={profile}
              isProvider={role === 'provider'}
              onChanged={() => { refreshProfile(); refresh(); }}
              onSignOut={() => { signOut(); setScreen({ name: 'home' }); }}
              onBack={() => setScreen({ name: 'home' })}
            />
          )}
          {ready && screen.name === 'editProvider' && me && (
            <EditProvider
              provider={me}
              onSave={async (p) => { await data.saveProvider(p); await refresh(); }}
              onBack={() => setScreen({ name: 'home' })}
            />
          )}
          {ready && screen.name === 'jobs' && (
            <JobList
              role={role}
              jobs={jobs}
              onNew={() => setScreen({ name: 'wizard' })}
              onOpen={(id) => setScreen({ name: 'job', id })}
              onBack={() => setScreen({ name: 'home' })}
            />
          )}
          {ready && screen.name === 'wizard' && userId && (
            <RequestWizard
              onCancel={() => setScreen({ name: 'jobs' })}
              onDone={async (r) => {
                await run(() => data.createJob(userId, r))();
                setScreen({ name: 'jobs' });
              }}
            />
          )}
          {ready && current && (
            <JobDetail
              job={current}
              role={role}
              providers={providers}
              loadCustomerReviews={data.reviewsAbout}
              actions={actions}
              onProfile={(id) => setScreen({ name: 'profile', id, back: screen })}
              onBack={() => setScreen({ name: 'jobs' })}
            />
          )}
          {ready && viewedProvider && screen.name === 'profile' && (
            <ProviderProfile provider={viewedProvider} onBack={() => setScreen(screen.back)} />
          )}
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </LangCtx.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 44 },
});
