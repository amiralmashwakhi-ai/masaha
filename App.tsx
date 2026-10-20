import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo, useState } from 'react';
import { loadProfile, Profile, signOut, useSession } from './src/auth';
import { CreateProfile, SignIn } from './src/screens/SignIn';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { applyDirection, makeT } from './src/i18n';
import { DEFAULT_MILESTONES, round } from './src/money';
import { mockGateway } from './src/payments';
import { Home } from './src/screens/Home';
import { JobActions, JobDetail } from './src/screens/JobDetail';
import { JobList } from './src/screens/JobList';
import { ProviderProfile } from './src/screens/ProviderProfile';
import { RequestWizard } from './src/screens/RequestWizard';
import { SEED_CUSTOMER_REVIEWS, SEED_PROVIDERS } from './src/seed';
import { Job, JobEvent, Lang, Role } from './src/types';
import { colors, LangCtx } from './src/ui';

type Screen =
  | { name: 'home' } | { name: 'jobs' } | { name: 'wizard' }
  | { name: 'job'; id: string } | { name: 'profile'; id: string; back: Screen };

// The prototype acts as the first seeded provider when in provider mode.
const ME_PROVIDER = SEED_PROVIDERS[0].id;

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [role, setRole] = useState<Role>('customer');
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  // Local state only until the backend is connected.
  const [jobs, setJobs] = useState<Job[]>([]);

  const { session, loading } = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const userId = session?.user.id;
  const refreshProfile = () => { if (userId) loadProfile(userId).then(setProfile); };
  useEffect(() => { setProfile(undefined); refreshProfile(); }, [userId]);
  useEffect(() => { if (profile && profile.role !== 'admin') setRole(profile.role); }, [profile]);

  const ctx = useMemo(() => ({ lang, t: makeT(lang), rtl: lang === 'ar' }), [lang]);

  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    applyDirection(next);
    setLang(next);
  };

  const update = (id: string, by: Role, kind: JobEvent['kind'], text: string, fn: (j: Job) => Job) =>
    setJobs((all) => all.map((j) =>
      j.id === id ? { ...fn(j), events: [...j.events, { at: new Date().toISOString(), by, kind, text }] } : j));

  const priceOf = (j: Job) => j.quotes.find((q) => q.id === j.acceptedQuoteId)?.priceJod ?? 0;

  const actions: JobActions = {
    sendQuote: (id, priceJod, days, scope) =>
      update(id, 'provider', 'quote', `${priceJod} JOD / ${days}d`, (j) => ({
        ...j, stage: 'quoted',
        quotes: [...j.quotes, { id: String(Date.now()), providerId: ME_PROVIDER, priceJod, days, scope }],
      })),
    acceptQuote: (id, quoteId) =>
      update(id, 'customer', 'stage', 'quote accepted', (j) => ({ ...j, acceptedQuoteId: quoteId })),
    sign: (id, by) =>
      update(id, by, 'stage', 'agreement signed', (j) => {
        const signedBy = [...j.signedBy, by];
        return { ...j, signedBy, stage: signedBy.length === 2 ? 'agreed' : j.stage };
      }),
    payEscrow: (id) => {
      const j = jobs.find((x) => x.id === id);
      if (!j) return;
      mockGateway.hold(id, priceOf(j)).then(({ ref }) =>
        update(id, 'customer', 'stage', `escrow ${priceOf(j)} JOD (${ref})`, (x) => ({
          ...x, stage: 'visitScheduled',
          milestones: x.milestones.map((m) => ({ ...m, status: 'held' })),
        })));
    },
    release: (id, key) => {
      const j = jobs.find((x) => x.id === id);
      const m = j?.milestones.find((x) => x.key === key);
      if (!j || !m) return;
      const amount = round(priceOf(j) * m.share);
      mockGateway.release(id, amount).then(() =>
        update(id, 'customer', 'stage', `released ${amount} JOD`, (x) => ({
          ...x, stage: key === 'delivery' ? 'done' : 'drafting',
          milestones: x.milestones.map((y) => (y.key === key ? { ...y, status: 'released' } : y)),
        })));
    },
    review: (id, by, stars, text) =>
      update(id, by, 'message', `review ${stars}★`, (j) => ({ ...j, reviews: [...j.reviews, { by, stars, text }] })),
  };

  const current = screen.name === 'job' ? jobs.find((j) => j.id === screen.id) : undefined;
  const provider = screen.name === 'profile' ? SEED_PROVIDERS.find((p) => p.id === screen.id) : undefined;

  return (
    <LangCtx.Provider value={ctx}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.body}>
          {!loading && !session && <SignIn />}
          {session && profile === null && userId && <CreateProfile userId={userId} onDone={refreshProfile} />}
          {session && profile && screen.name === 'home' && (
            <Home
              onToggleLang={toggleLang}
              onSignOut={() => { signOut(); setScreen({ name: 'home' }); }}
              onRole={() => setScreen({ name: 'jobs' })}
              role={role}
            />
          )}
          {session && profile && screen.name === 'jobs' && (
            <JobList
              role={role}
              jobs={jobs}
              onNew={() => setScreen({ name: 'wizard' })}
              onOpen={(id) => setScreen({ name: 'job', id })}
              onBack={() => setScreen({ name: 'home' })}
            />
          )}
          {session && profile && screen.name === 'wizard' && (
            <RequestWizard
              onCancel={() => setScreen({ name: 'jobs' })}
              onDone={(r) => {
                setJobs([{
                  ...r, quotes: [], reviews: [], signedBy: [], milestones: DEFAULT_MILESTONES,
                  events: [{ at: r.createdAt, by: 'customer', kind: 'stage', text: 'request created' }],
                }, ...jobs]);
                setScreen({ name: 'jobs' });
              }}
            />
          )}
          {session && profile && current && (
            <JobDetail
              job={current}
              role={role}
              providers={SEED_PROVIDERS}
              customerReviews={SEED_CUSTOMER_REVIEWS}
              actions={actions}
              onProfile={(id) => setScreen({ name: 'profile', id, back: screen })}
              onBack={() => setScreen({ name: 'jobs' })}
            />
          )}
          {session && profile && provider && screen.name === 'profile' && (
            <ProviderProfile provider={provider} onBack={() => setScreen(screen.back)} />
          )}
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    </LangCtx.Provider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1, padding: 16, paddingTop: 40 },
});
