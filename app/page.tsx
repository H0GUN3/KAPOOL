'use client';

import { useState } from 'react';
import { theme, RIDES } from './lib/theme';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './components/screens/LoginScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { DetailScreen } from './components/screens/DetailScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { RegisterScreen } from './components/screens/RegisterScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';

type Ride = (typeof RIDES)[0];

export default function App() {
  const [screen, setScreen] = useState<string>('login');
  const [tab, setTab] = useState<string>('home');
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [prevScreen, setPrevScreen] = useState<string | null>(null);

  const navigate = (to: string) => {
    setPrevScreen(screen);
    setScreen(to);
  };

  const handleTabChange = (t: string) => {
    setTab(t);
    if (t === 'home') navigate('home');
    else if (t === 'register') navigate('register');
    else if (t === 'chat') navigate('chat');
    else if (t === 'profile') navigate('profile');
    else if (t === 'search') navigate('home');
  };

  const renderScreen = () => {
    switch (screen) {
      case 'login':
        return <LoginScreen onLogin={() => navigate('home')} />;
      case 'home':
        return (
          <HomeScreen
            onRideClick={(r) => {
              setSelectedRide(r);
              navigate('detail');
            }}
          />
        );
      case 'detail':
        return (
          <DetailScreen
            ride={selectedRide}
            onBack={() => navigate('home')}
            onChat={() => navigate('chat')}
          />
        );
      case 'chat':
        return (
          <ChatScreen
            onBack={() => navigate(prevScreen === 'detail' ? 'detail' : 'home')}
          />
        );
      case 'register':
        return <RegisterScreen />;
      case 'profile':
        return <ProfileScreen onLogout={() => navigate('login')} />;
      default:
        return (
          <HomeScreen
            onRideClick={(r) => {
              setSelectedRide(r);
              navigate('detail');
            }}
          />
        );
    }
  };

  const showNav = !['login', 'detail'].includes(screen);
  const activeTab = ['home', 'search', 'register', 'chat', 'profile'].includes(tab)
    ? tab
    : 'home';

  return (
    <div
      className="w-full h-screen flex flex-col overflow-hidden"
      style={{
        background: theme.bg0,
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;700;900&family=Plus+Jakarta+Sans:wght@400;600;800;900&display=swap');
        * { box-sizing: border-box; }
        input, textarea { box-sizing: border-box; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        body { margin: 0; padding: 0; }
      `}</style>

      {/* Mobile Screen */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: theme.bg0 }}>
        <div className="flex-1 flex flex-col overflow-hidden">{renderScreen()}</div>

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
