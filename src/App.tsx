import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './services/auth/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Modal } from './components/Modal';
import { AuthPages } from './pages/AuthPages';
import { TopAdminClaimModal } from './components/TopAdminClaimModal';
import { HomeDashboard } from './pages/HomeDashboard';
import { ChallengePage } from './pages/ChallengePage';
import { ProofPage } from './pages/ProofPage';
import { WinPage } from './pages/WinPage';
import { RankPage } from './pages/RankPage';
import { ConnectPage } from './pages/ConnectPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminReviewPage } from './pages/AdminReviewPage';
import { TopAdminPanel } from './pages/TopAdminPanel';
import { api } from './services/api';
import {
  Challenge,
  Prize,
  LeaderboardEntry,
  CommunityPost,
  ProofSubmission,
  OrganizationProfile,
} from './types';

const MainContent: React.FC = () => {
  const { user, isAuthenticated, isAdmin, isTopAdmin, refreshUser } = useAuth();

  // Navigation State
  const [currentTab, setCurrentTab] = useState<string>('home');

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
  const [ownerSetupModalOpen, setOwnerSetupModalOpen] = useState<boolean>(false);

  // Application Data
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<ProofSubmission[]>([]);
  const [pendingReviewsCount, setPendingReviewsCount] = useState<number>(0);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile | undefined>(undefined);

  // Fetch Public Data
  const fetchPublicData = async () => {
    try {
      const [chRes, przRes, rankRes, postRes, orgRes] = await Promise.all([
        api.getChallenges().catch(() => ({ challenges: [] })),
        api.getPrizes().catch(() => ({ prizes: [] })),
        api.getLeaderboard().catch(() => ({ leaderboard: [] })),
        api.getCommunityPosts().catch(() => ({ posts: [] })),
        api.getOrgProfile().catch(() => ({ profile: undefined })),
      ]);

      setChallenges(chRes.challenges || []);
      setPrizes(przRes.prizes || []);
      setLeaderboard(rankRes.leaderboard || []);
      setCommunityPosts(postRes.posts || []);
      if (orgRes.profile) setOrgProfile(orgRes.profile);
    } catch (err) {
      console.error('Failed to fetch public data:', err);
    }
  };

  // Fetch User-specific & Admin Data
  const fetchUserData = async () => {
    if (!isAuthenticated) {
      setUserSubmissions([]);
      setPendingReviewsCount(0);
      return;
    }

    try {
      const subRes = await api.getMySubmissions().catch(() => ({ submissions: [] }));
      setUserSubmissions(subRes.submissions || []);

      if (isAdmin) {
        const adminSubRes = await api.getAdminSubmissions('PENDING').catch(() => ({ submissions: [] }));
        setPendingReviewsCount(adminSubRes.submissions?.length || 0);
      }
    } catch (err) {
      console.error('Failed to fetch user submissions:', err);
    }
  };

  useEffect(() => {
    fetchPublicData();
  }, []);

  useEffect(() => {
    fetchUserData();
  }, [isAuthenticated, isAdmin]);

  const handleOpenAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setAuthModalOpen(false);
    fetchUserData();
    fetchPublicData();
  };

  const handleProofSubmitted = () => {
    fetchUserData();
    refreshUser();
  };

  const handleAdminReviewDone = () => {
    fetchUserData();
    fetchPublicData();
    refreshUser();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbf7ed] text-[#40281d] selection:bg-[#e2a72e]/30 selection:text-[#40281d]">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenOwnerSetup={() => setOwnerSetupModalOpen(true)}
        onOpenAuthModal={handleOpenAuth}
        pendingReviewsCount={pendingReviewsCount}
        orgProfile={orgProfile}
      />

      {/* Main View Router - Mobile First App Container */}
      <main
        className={`flex-1 w-full mx-auto px-4 sm:px-6 py-5 sm:py-8 pb-24 lg:pb-12 ${
          currentTab === 'top-admin' || currentTab === 'admin-reviews'
            ? 'max-w-5xl'
            : 'max-w-2xl'
        }`}
      >
        {currentTab === 'home' && (
          <HomeDashboard
            challenges={challenges}
            onNavigate={setCurrentTab}
            pendingSubmissionsCount={pendingReviewsCount}
          />
        )}

        {currentTab === 'challenge' && (
          <ChallengePage
            challenges={challenges}
            onNavigateToProof={() => setCurrentTab('proof')}
            onNavigateToTopAdmin={isTopAdmin ? () => setCurrentTab('top-admin') : undefined}
          />
        )}

        {currentTab === 'proof' && (
          <ProofPage
            userSubmissions={userSubmissions}
            onSubmissionSuccess={handleProofSubmitted}
            onNavigateToAuth={() => handleOpenAuth('login')}
          />
        )}

        {currentTab === 'win' && (
          <WinPage
            prizes={prizes}
            onNavigateToProof={() => setCurrentTab('proof')}
            onNavigateToTopAdmin={isTopAdmin ? () => setCurrentTab('top-admin') : undefined}
          />
        )}

        {currentTab === 'rank' && (
          <RankPage
            leaderboard={leaderboard}
            onNavigateToProof={() => setCurrentTab('proof')}
          />
        )}

        {currentTab === 'connect' && (
          <ConnectPage
            posts={communityPosts}
            onPostCreated={fetchPublicData}
            onNavigateToAuth={() => handleOpenAuth('login')}
          />
        )}

        {currentTab === 'profile' && (
          <ProfilePage
            onNavigateToProof={() => setCurrentTab('proof')}
            onNavigateToTopAdmin={isTopAdmin ? () => setCurrentTab('top-admin') : undefined}
            onNavigateToAuth={() => handleOpenAuth('login')}
          />
        )}

        {currentTab === 'admin-reviews' && (
          <AdminReviewPage onReviewCompleted={handleAdminReviewDone} />
        )}

        {currentTab === 'top-admin' && (
          <TopAdminPanel
            challenges={challenges}
            prizes={prizes}
            onRefreshData={() => {
              fetchPublicData();
              fetchUserData();
            }}
          />
        )}
      </main>

      {/* Footer */}
      <Footer orgProfile={orgProfile} />

      {/* Auth Modal */}
      <Modal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title=""
        maxWidth="md"
      >
        <AuthPages
          initialMode={authMode}
          onSuccess={handleAuthSuccess}
          onClose={() => setAuthModalOpen(false)}
        />
      </Modal>

      {/* Owner Setup / Claim Top Admin Modal */}
      <TopAdminClaimModal
        isOpen={ownerSetupModalOpen}
        onClose={() => setOwnerSetupModalOpen(false)}
        onSuccess={() => {
          refreshUser();
          fetchUserData();
          fetchPublicData();
        }}
      />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}

export default App;
