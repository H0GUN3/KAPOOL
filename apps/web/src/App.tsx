import { useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import type { AuthSessionDto, AuthUser, Ride, RideRequest, SignupRequestDto } from '@kapool/shared';
import { theme } from './lib/theme';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { SearchScreen } from './screens/SearchScreen';
import { DetailScreen } from './screens/DetailScreen';
import { ChatScreen } from './screens/ChatScreen';
import { RegisterScreen } from './screens/RegisterScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { VehicleScreen } from './screens/VehicleScreen';
import { RideRequestsScreen } from './screens/RideRequestsScreen';
import { ReservationsScreen } from './screens/ReservationsScreen';
import { AdminScreen } from './screens/AdminScreen';
import { fetchCurrentSession, loginWithCredentials, signupWithCredentials } from './lib/api';

const sessionStorageKey = 'kapool.auth.session';
const bottomNavReserve = 'calc(5.875rem + env(safe-area-inset-bottom))';

function getInitialSession(): AuthSessionDto | null {
  const stored = window.localStorage.getItem(sessionStorageKey);

  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as AuthSessionDto;
  } catch {
    window.localStorage.removeItem(sessionStorageKey);
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<AuthSessionDto | null>(() => getInitialSession());

  return (
    <AppShell session={session} onSessionChange={setSession} />
  );
}

function AppShell({
  session,
  onSessionChange,
}: {
  session: AuthSessionDto | null;
  onSessionChange: (session: AuthSessionDto | null) => void;
}) {
  const [screen, setScreen] = useState<string>(() => (session ? 'home' : 'login'));
  const [tab, setTab] = useState<string>('home');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [selectedRideRequestId, setSelectedRideRequestId] = useState<string | null>(null);
  const [rideRefreshKey, setRideRefreshKey] = useState(0);
  const [prevScreen, setPrevScreen] = useState<string | null>(null);
  const routerNavigate = useNavigate();
  const location = useLocation();
  const accessToken = session?.accessToken;
  const userName = session?.user.profile?.nickname || session?.user.profile?.name;

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let isActive = true;

    fetchCurrentSession(accessToken)
      .then((nextSession) => {
        if (!isActive) {
          return;
        }

        window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
        onSessionChange(nextSession);
      })
      .catch(() => {
        if (!isActive) {
          return;
        }

        window.localStorage.removeItem(sessionStorageKey);
        onSessionChange(null);
        setScreen('login');
        routerNavigate('/login');
      });

    return () => {
      isActive = false;
    };
  }, [accessToken, onSessionChange, routerNavigate]);

  const handleLogin = async (email: string, password: string) => {
    const nextSession = await loginWithCredentials({ email, password });

    window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    onSessionChange(nextSession);
    setScreen('home');
    setTab('home');
    routerNavigate('/app');
  };

  const handleSignup = async (credentials: SignupRequestDto) => {
    const nextSession = await signupWithCredentials(credentials);

    window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    onSessionChange(nextSession);
    setScreen('home');
    setTab('home');
    routerNavigate('/app');
  };

  const handleLogout = () => {
    window.localStorage.removeItem(sessionStorageKey);
    onSessionChange(null);
    setScreen('login');
    routerNavigate('/login');
  };

  const handleUserUpdate = (user: AuthUser) => {
    if (!session) {
      return;
    }

    const nextSession = { ...session, user };
    window.localStorage.setItem(sessionStorageKey, JSON.stringify(nextSession));
    onSessionChange(nextSession);

    if (user.role === 'driver') {
      setSelectedRide((currentRide) => {
        if (!currentRide || currentRide.driverId !== user.id) {
          return currentRide;
        }

        return {
          ...currentRide,
          driver: user.profile.nickname || user.profile.name,
          driverDepartment: user.profile.department,
          driverPhotoDataUrl: user.profile.photoDataUrl,
        };
      });
      setRideRefreshKey((key) => key + 1);
    }
  };

  const navigate = (to: string) => {
    setPrevScreen(screen);
    setScreen(to);
  };

  const handleTabChange = (t: string) => {
    setTab(t);
    if (t === 'home') navigate('home');
    else if (t === 'register') navigate('register');
    else if (t === 'chat') {
      setSelectedRide(null);
      setSelectedRideRequestId(null);
      navigate('chat');
    }
    else if (t === 'profile') navigate('profile');
    else if (t === 'search') navigate('search');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} onSignup={handleSignup} />;
      case 'home':
        if (session?.user.role === 'admin') {
          return (
            <AdminScreen
              accessToken={session.accessToken}
              userName={session.user.profile.nickname}
              userId={session.user.id}
              userPhotoDataUrl={session.user.profile.photoDataUrl}
            />
          );
        }

        return (
          <HomeScreen
            accessToken={session?.accessToken ?? ''}
            userRole={session?.user.role}
            currentUserId={session?.user.id}
            userName={userName}
            userPhotoDataUrl={session?.user.profile.photoDataUrl}
            refreshKey={rideRefreshKey}
            onRideClick={(r) => {
              setSelectedRide(r);
              setSelectedRideRequestId(null);
              navigate('detail');
            }}
            onRideRequestChat={(request) => {
              setSelectedRide(null);
              setSelectedRideRequestId(String(request.id));
              navigate('chat');
            }}
          />
        );
      case 'search':
        return (
          <SearchScreen
            accessToken={session?.accessToken ?? ''}
            refreshKey={rideRefreshKey}
            onRideClick={(r) => {
              setSelectedRide(r);
              setSelectedRideRequestId(null);
              navigate('detail');
            }}
          />
        );
      case 'detail':
        return (
          <DetailScreen
            accessToken={session?.accessToken ?? ''}
            currentUserId={session?.user.id ?? ''}
            userRole={session?.user.role}
            ride={selectedRide}
            onBack={() => navigate(prevScreen === 'search' ? 'search' : 'home')}
            onChat={() => {
              setSelectedRideRequestId(null);
              navigate('chat');
            }}
            onReservationChange={() => setRideRefreshKey((key) => key + 1)}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            accessToken={session?.accessToken ?? ''}
            ride={selectedRide}
            rideRequestId={selectedRideRequestId}
            onBack={() => navigate(prevScreen === 'detail' ? 'detail' : 'home')}
          />
        );
      case 'register':
        return (
          <RegisterScreen
            accessToken={session?.accessToken ?? ''}
            userRole={session?.user.role}
            userName={userName}
            onSuccess={() => {
              setRideRefreshKey((key) => key + 1);
              setTab('home');
              navigate('home');
            }}
          />
        );
      case 'profile':
        return (
          <ProfileScreen
            accessToken={session?.accessToken}
            onLogout={handleLogout}
            onUserUpdate={handleUserUpdate}
            user={session?.user}
            onVehicleOpen={() => navigate('vehicle')}
            onReservationsOpen={() => navigate('reservations')}
            onRideRequestsOpen={() => navigate('rideRequests')}
          />
        );
      case 'vehicle':
        return (
          <VehicleScreen
            accessToken={session?.accessToken ?? ''}
            onBack={() => navigate('profile')}
          />
        );
      case 'reservations':
        return (
          <ReservationsScreen
            accessToken={session?.accessToken ?? ''}
            userRole={session?.user.role}
            currentUserId={session?.user.id}
            onRideClick={(ride) => {
              setSelectedRide(ride);
              navigate('detail');
            }}
            onBack={() => navigate('profile')}
          />
        );
      case 'rideRequests':
        return (
          <RideRequestsScreen
            accessToken={session?.accessToken ?? ''}
            currentUserId={session?.user.id ?? ''}
            onChatRequest={(request: RideRequest) => {
              setSelectedRide(null);
              setSelectedRideRequestId(String(request.id));
              navigate('chat');
            }}
            onBack={() => navigate('profile')}
          />
        );
      default:
        if (session?.user.role === 'admin') {
          return (
            <AdminScreen
              accessToken={session.accessToken}
              userName={session.user.profile.nickname}
              userId={session.user.id}
              userPhotoDataUrl={session.user.profile.photoDataUrl}
            />
          );
        }

        return (
          <HomeScreen
            accessToken={session?.accessToken ?? ''}
            userRole={session?.user.role}
            currentUserId={session?.user.id}
            userName={userName}
            refreshKey={rideRefreshKey}
            onRideClick={(r) => {
              setSelectedRide(r);
              navigate('detail');
            }}
          />
        );
    }
  };

  const showNav = session && location.pathname === '/app' && !['login', 'detail', 'vehicle', 'reservations', 'rideRequests'].includes(screen);
  const activeTab = ['home', 'search', 'register', 'chat', 'profile'].includes(tab)
    ? tab
    : 'home';

  const renderAuthenticatedApp = () => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }

    return renderScreen();
  };

  const renderAdminRoute = () => {
    if (!session) {
      return <Navigate to="/login" replace />;
    }

    if (session.user.role !== 'admin') {
      return <AdminBlocked onBack={() => routerNavigate('/app')} />;
    }

    return (
      <AdminScreen
        accessToken={session.accessToken}
        userName={session.user.profile.nickname}
        onBack={() => routerNavigate('/app')}
      />
    );
  };

  return (
    <div
      className="h-dvh min-h-0 w-full flex flex-col overflow-hidden"
      style={{
        background: theme.bg0,
        fontFamily: theme.fontSans,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        input, textarea { box-sizing: border-box; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Mobile Screen */}
      <div className="kapool-app-frame min-h-0 flex-1 flex flex-col overflow-hidden" style={{ background: theme.bg0 }}>
        <div
          className="min-h-0 flex-1 flex flex-col overflow-hidden"
          style={{ paddingBottom: showNav ? bottomNavReserve : 0 }}
        >
          <Routes>
            <Route path="/login" element={session ? <Navigate to="/app" replace /> : <LoginScreen onLogin={handleLogin} onSignup={handleSignup} />} />
            <Route path="/app" element={renderAuthenticatedApp()} />
            <Route path="/admin" element={renderAdminRoute()} />
            <Route path="*" element={<Navigate to={session ? '/app' : '/login'} replace />} />
          </Routes>
        </div>

        {showNav && (
          <BottomNav
            active={activeTab}
            onChange={(t) => {
              setTab(t);
              handleTabChange(t);
            }}
          />
        )}
      </div>
    </div>
  );
}

function AdminBlocked({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-full flex flex-col justify-center px-6" style={{ color: theme.txt0 }}>
      <div className="rounded-2xl border p-5" style={{ background: theme.card, borderColor: theme.border }}>
        <div className="text-lg font-black mb-2">운영자 권한이 필요합니다</div>
        <p className="text-sm mb-5" style={{ color: theme.txt1, lineHeight: 1.7 }}>
          현재 계정은 관리자 경로에 접근할 수 없습니다. 운영자 계정으로 다시 로그인해 주세요.
        </p>
        <button className="w-full h-11 rounded-xl text-sm font-bold" onClick={onBack} style={{ background: theme.mint, color: '#FFFFFF' }}>
          홈으로 돌아가기
        </button>
      </div>
    </div>
  );
}
