import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { loadProfile, Profile, signOut, useSession } from './src/auth';
import * as data from './src/data';
import { applyDirection, makeT } from './src/i18n';
import { EditProvider } from './src/screens/EditProvider';
import { History } from './src/screens/History';
import { Home } from './src/screens/Home';
import { CustomerProfile } from './src/screens/CustomerProfile';
import { Faq } from './src/screens/Faq';
import { Guide } from './src/screens/Guide';
import { Menu } from './src/screens/Menu';
import { PostEditor, PostFeed } from './src/screens/Posts';
import { NeedLicense, Notifications } from './src/screens/Safety';
import { Settings } from './src/screens/Settings';
import { Chats } from './src/screens/Chats';
import { Tab, TabBar } from './src/screens/TabBar';
import { JobActions, JobDetail } from './src/screens/JobDetail';
import { JobList } from './src/screens/JobList';
import { ProviderProfile } from './src/screens/ProviderProfile';
import { RequestWizard } from './src/screens/RequestWizard';
import { ConsentGate, CreateProfile, SignIn } from './src/screens/SignIn';
import { Job, Lang, Provider, Role, ServiceId } from './src/types';
import { colors, Header, LangCtx, P, setDark } from './src/ui';

type Screen =
  | { name: 'home' } | { name: 'jobs' } | { name: 'wizard'; service?: ServiceId; providerId?: string } | { name: 'editProvider' } | { name: 'settings' }
  | { name: 'posts' } | { name: 'newPost' } | { name: 'history' } | { name: 'notifications' } | { name: 'faq' } | { name: 'guide' }
  | { name: 'chats' }
  | { name: 'job'; id: string; back?: Screen; chat?: boolean } | { name: 'profile'; id: string; back: Screen }
  | { name: 'customer'; id: string; back: Screen };

const PREFS = { lang: 'masaha.lang', dark: 'masaha.dark' };

export default function App() {
  const [lang, setLang] = useState<Lang>('ar');
  const [dark, setDarkState] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [role, setRole] = useState<Role>('customer');
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [jobs, setJobs] = useState<Job[]>([]);
  const [people, setPeople] = useState<Record<string, data.PublicPerson>>({});
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState('');
  const [unread, setUnread] = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  // A job opened from the admin panel may not be in the user's own list.
  const [extraJob, setExtraJob] = useState<Job | null>(null);

  const { session, loading } = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const userId = session?.user.id;
  const refreshProfile = () => { if (userId) loadProfile(userId).then(setProfile); };
  useEffect(() => { setProfile(undefined); refreshProfile(); }, [userId]);
  useEffect(() => { if (profile && profile.role !== 'admin') setRole(profile.role); }, [profile]);

  const applyLang = (next: Lang) => { applyDirection(next); setLang(next); };
  const applyDark = (on: boolean) => { setDark(on); setDarkState(on); };
  // Remember language and night mode between launches; storage can fail, so defaults stay usable.
  useEffect(() => {
    AsyncStorage.multiGet([PREFS.lang, PREFS.dark]).then(([[, l], [, d]]) => {
      if (l === 'en' || l === 'ar') applyLang(l);
      if (d === '1') applyDark(true);
    }).catch(() => {});
  }, []);
  const toggleLang = () => {
    const next = lang === 'ar' ? 'en' : 'ar';
    applyLang(next);
    AsyncStorage.setItem(PREFS.lang, next).catch(() => {});
  };
  const toggleDark = () => {
    applyDark(!dark);
    AsyncStorage.setItem(PREFS.dark, dark ? '0' : '1').catch(() => {});
  };
  const ctx = useMemo(() => ({ lang, t: makeT(lang), rtl: lang === 'ar', toggleLang, dark, toggleDark }), [lang, dark]);

  const refresh = useCallback(async () => {
    if (!userId || !profile) return;
    try {
      const list = await data.listJobs(role, userId);
      setJobs(list);
      const ids = new Set(list.flatMap((j) => j.quotes.map((q) => q.providerId)));
      if (role === 'provider') ids.add(userId);
      setProviders(await data.loadProviders([...ids]));
      if (role === 'provider') data.publicProfiles([...new Set(list.map((j) => j.customerId))]).then(setPeople).catch(() => {});
      setError('');
    } catch {
      setError(ctx.t('somethingWrong'));
    }
  }, [userId, profile, role, ctx]);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!userId || !profile) { setUnread(0); setChatUnread(0); return; }
    const poll = () => {
      data.unreadCount().then(setUnread).catch(() => {});
      data.chatUnreadTotal().then(setChatUnread).catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 30000);
    return () => clearInterval(timer);
  }, [userId, profile]);

  // Runs a database action, then reloads so the screen always shows the stored state.
  const run = (fn: () => Promise<unknown>) => async () => {
    try { await fn(); } catch { setError(ctx.t('somethingWrong')); }
    await refresh();
  };

  const actions: JobActions = {
    sendQuote: (id, priceJod, days, scope) => { if (userId) run(() => data.sendQuote(id, userId, priceJod, days, scope))(); },
    acceptQuote: (_id, quoteId) => run(() => data.acceptQuote(quoteId))(),
    sign: (id) => run(() => data.signAgreement(id))(),
    unsign: (id) => run(() => data.unsignAgreement(id))(),
    payEscrow: (id) => run(() => data.payEscrow(id))(),
    advance: (id) => run(() => data.advanceStage(id))(),
    release: (id, key) => run(() => data.releaseMilestone(id, key))(),
    review: (id, by, stars, text) => {
      const job = jobs.find((j) => j.id === id);
      if (job && userId && profile) run(() => data.leaveReview(job, userId, by, profile.full_name, stars, text))();
    },
  };

  const current = screen.name === 'job'
    ? jobs.find((j) => j.id === screen.id) ?? (extraJob?.id === screen.id ? extraJob : undefined)
    : undefined;
  // A job opened from a notification may belong to a customer we haven't named yet.
  useEffect(() => {
    const id = current?.customerId;
    if (role === 'provider' && id && !people[id]) data.publicProfiles([id]).then((m) => setPeople((cur) => ({ ...cur, ...m }))).catch(() => {});
  }, [current?.customerId, role]);
  const viewedProvider = screen.name === 'profile' ? providers.find((p) => p.id === screen.id) : undefined;
  const me = providers.find((p) => p.id === userId);
  const ready = session && profile && profile.data_consent_at;
  // The provider feed hides jobs another provider won; those stay in History.
  const visibleJobs = role === 'provider'
    ? jobs.filter((j) => j.providerId ? j.providerId === userId : j.stage !== 'cancelled')
    : jobs;

  // Providers seen in posts may not be loaded yet.
  const openProfile = async (id: string) => {
    if (!providers.some((p) => p.id === id)) {
      const loaded = await data.loadProviders([id]).catch(() => []);
      setProviders((cur) => [...cur, ...loaded]);
    }
    setScreen({ name: 'profile', id, back: screen });
  };
  const openCustomer = (id: string) => setScreen({ name: 'customer', id, back: screen });
  const goHome = () => setScreen({ name: 'home' });
  // Phone back button on screens without their own back step: go home, and leave the app from home.
  // Registered once at start so each screen's BackButton (registered later) is asked first.
  const atHome = useRef(true);
  atHome.current = screen.name === 'home';
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (atHome.current) return false;
      setScreen({ name: 'home' });
      return true;
    });
    return () => sub.remove();
  }, []);
  const openAnyJob = async (id: string, chat?: boolean) => {
    if (!jobs.some((j) => j.id === id)) {
      try { setExtraJob(await data.getJob(id)); } catch { setError(ctx.t('somethingWrong')); return; }
    }
    setScreen({ name: 'job', id, back: screen, chat });
  };
  const requestService = (service: ServiceId) => setScreen({ name: 'wizard', service });
  const activeTab: Tab | undefined = screen.name === 'home' ? 'home' : screen.name === 'chats' ? 'chats'
    : screen.name === 'wizard' || screen.name === 'newPost' ? 'add'
    : screen.name === 'jobs' || (screen.name === 'profile' && screen.id === userId) ? 'mine'
    : screen.name === 'settings' ? 'account' : undefined;
  const onTab = (tab: Tab) => {
    if (tab === 'home') goHome();
    else if (tab === 'chats') setScreen({ name: 'chats' });
    else if (tab === 'add') setScreen(role === 'provider' ? (me ? { name: 'newPost' } : { name: 'editProvider' }) : { name: 'wizard' });
    else if (tab === 'mine') { if (role === 'provider' && me) openProfile(me.id); else setScreen({ name: 'jobs' }); }
    else setScreen({ name: 'settings' });
  };

  return (
    <SafeAreaProvider>
      <LangCtx.Provider value={ctx}>
        <SafeAreaView key={dark ? 'dark' : 'light'} edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
          <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
            <Header onMenu={() => setMenuOpen(true)} onBell={ready ? () => { setUnread(0); setScreen({ name: 'notifications' }); } : undefined} unread={unread} />
            {!loading && !session && screen.name !== 'faq' && screen.name !== 'guide' && (
              <SignIn onFaq={() => setScreen({ name: 'faq' })} onGuide={() => setScreen({ name: 'guide' })} />
            )}
            {screen.name === 'faq' && <Faq onBack={goHome} />}
            {screen.name === 'guide' && <Guide role={ready ? role : 'customer'} onBack={goHome} />}
            {session && profile === undefined && <P muted>{ctx.t('loading')}</P>}
            {session && profile === null && userId && (
              <CreateProfile userId={userId} defaultName={session.user.user_metadata?.full_name} onDone={refreshProfile} />
            )}
            {session && profile && !profile.data_consent_at && <ConsentGate onDone={refreshProfile} />}
            {!!error && ready && <P>{error}</P>}
            {ready && screen.name === 'home' && (
              <Home
                role={role}
                userId={userId!}
                onFaq={() => setScreen({ name: 'faq' })}
                onGuide={() => setScreen({ name: 'guide' })}
                name={profile.full_name}
                coverUrl={profile.cover_url}
                jobs={visibleJobs}
                verified={!!me?.verified}
                rating={me?.reviews.length ? me.reviews.reduce((a, r) => a + r.stars, 0) / me.reviews.length : undefined}
                onOpenJob={(id) => setScreen({ name: 'job', id, back: screen })}
                onService={requestService}
                onVerify={() => setScreen({ name: 'settings' })}
                onJobs={() => setScreen({ name: 'jobs' })}
                onNew={() => setScreen({ name: 'wizard' })}
                onBrowse={() => setScreen({ name: 'posts' })}
                onNewPost={role === 'provider' && me ? () => setScreen({ name: 'newPost' }) : undefined}
                onEditProfile={role === 'provider' && me ? () => openProfile(me.id) : undefined}
                onHistory={() => setScreen({ name: 'history' })}
              />
            )}
            {ready && screen.name === 'settings' && (
              <Settings
                profile={profile}
                isProvider={role === 'provider'}
                onChanged={() => { refreshProfile(); refresh(); }}
                onSignOut={() => { signOut(); goHome(); }}
                onBack={goHome}
              />
            )}
            {ready && screen.name === 'editProvider' && me && (
              <EditProvider
                provider={me}
                onSave={async (p) => { await data.saveProvider(p); await refresh(); }}
                onBack={() => openProfile(me.id)}
              />
            )}
            {ready && screen.name === 'posts' && (
              <PostFeed
                role={role}
                userId={userId!}
                onProvider={openProfile}
                onRequest={requestService}
                onNewPost={role === 'provider' && me ? () => setScreen({ name: 'newPost' }) : undefined}
                onBack={goHome}
              />
            )}
            {ready && screen.name === 'newPost' && userId && (
              me?.verified ? <PostEditor userId={userId} onDone={() => openProfile(userId)} onBack={goHome} />
                : <NeedLicense onSettings={() => setScreen({ name: 'settings' })} />
            )}
            {ready && screen.name === 'history' && userId && (
              <History
                role={role}
                userId={userId}
                jobs={jobs}
                onOpenJob={(id) => setScreen({ name: 'job', id, back: screen })}
                onBack={goHome}
              />
            )}
            {ready && screen.name === 'notifications' && (
              <Notifications onOpenJob={openAnyJob} onBack={goHome} />
            )}
            {ready && screen.name === 'jobs' && (
              role === 'provider' && !me?.verified ? <NeedLicense onSettings={() => setScreen({ name: 'settings' })} /> : <JobList
                role={role}
                jobs={visibleJobs}
                people={people}
                onPerson={openCustomer}
                onNew={() => setScreen({ name: 'wizard' })}
                onOpen={(id) => setScreen({ name: 'job', id })}
                onBack={goHome}
              />
            )}
            {ready && screen.name === 'wizard' && userId && (
              <RequestWizard
                initialService={screen.service}
                invited={screen.providerId ? { id: screen.providerId, name: providers.find((p) => p.id === screen.providerId)?.name ?? '' } : undefined}
                onCancel={() => setScreen({ name: 'jobs' })}
                onDone={async (rs) => {
                  await run(() => data.createJobs(userId, rs))();
                  setScreen({ name: 'jobs' });
                }}
              />
            )}
            {ready && current && userId && screen.name === 'job' && (
              <JobDetail
                job={current}
                role={role}
                userId={userId}
                providers={providers}
                loadCustomerReviews={data.reviewsAbout}
                actions={actions}
                onChanged={async () => {
                  await refresh();
                  if (extraJob?.id === current.id) data.getJob(current.id).then(setExtraJob).catch(() => {});
                }}
                onProfile={openProfile}
                onCustomer={openCustomer}
                customerName={people[current.customerId]?.name}
                openChat={screen.chat}
                canQuote={!!me?.verified}
                onVerify={() => setScreen({ name: 'settings' })}
                siblings={current.projectId ? visibleJobs.filter((j) => j.projectId === current.projectId && j.id !== current.id) : []}
                onOpenJob={(id) => setScreen({ name: 'job', id, back: screen.back })}
                onBack={() => setScreen(screen.back ?? { name: 'jobs' })}
              />
            )}
            {ready && viewedProvider && screen.name === 'profile' && (
              <ProviderProfile
                provider={viewedProvider}
                role={role}
                mine={viewedProvider.id === userId}
                viewerId={userId!}
                onRequest={requestService}
                onDirect={viewedProvider.verified ? () => setScreen({ name: 'wizard', providerId: viewedProvider.id }) : undefined}
                onNewPost={() => setScreen({ name: 'newPost' })}
                onEdit={() => setScreen({ name: 'editProvider' })}
                onBack={() => setScreen(screen.back)}
              />
            )}
            {ready && screen.name === 'customer' && <CustomerProfile id={screen.id} onBack={() => setScreen(screen.back)} />}
            {ready && screen.name === 'chats' && <Chats onOpen={(id) => { setChatUnread(0); openAnyJob(id, true); }} />}
          </View>
          {ready && <TabBar role={role} active={activeTab} chatUnread={chatUnread} onTab={onTab} />}
          <Menu
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            signedIn={!!ready}
            onHome={goHome}
            onProfile={() => (role === 'provider' && me ? openProfile(me.id) : setScreen({ name: 'settings' }))}
            onHistory={() => setScreen({ name: 'history' })}
            onSettings={() => setScreen({ name: 'settings' })}
            onFaq={() => setScreen({ name: 'faq' })}
            onGuide={() => setScreen({ name: 'guide' })}
            onSignOut={() => { signOut(); goHome(); }}
          />
          <StatusBar style={dark ? 'light' : 'dark'} />
        </SafeAreaView>
      </LangCtx.Provider>
    </SafeAreaProvider>
  );
}
