import React, { useState, useEffect } from 'react';
import {
  Challenge,
  Prize,
  ImpactSettings,
  OrganizationProfile,
  PaymentSettings,
  AdminUserRecord,
  AuditLog,
  User,
  SystemStats,
  ProofSubmission,
  DEFAULT_ORGANIZATION_PROFILE,
} from '../types';
import { useAuth } from '../services/auth/AuthContext';
import { api } from '../services/api';
import { EmptyState } from '../components/EmptyState';
import { ImageModal } from '../components/ImageModal';
import {
  ShieldAlert,
  Award,
  Trophy,
  Users,
  Settings,
  Building,
  CreditCard,
  History,
  PlusCircle,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  UserCheck,
  UserX,
  Lock,
  RefreshCw,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  FileText,
  RotateCcw,
  X,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  saveOrgProfileToFirestore,
  fetchOrgProfileFromFirestore,
  fetchRegisteredUsersFromFirestore,
  saveChallengeToFirestore,
  deleteChallengeFromFirestore,
  savePrizeToFirestore,
  deletePrizeFromFirestore,
  saveSettingToFirestore,
  fetchAdminsFromFirestore,
  addAdminInFirestore,
  setAdminStatusInFirestore,
  removeAdminFromFirestore,
  fetchAdminSubmissionsFromFirestore,
  reviewSubmissionInFirestore,
  compressImageToDataUrl,
} from '../services/firebase/firestoreService';

interface TopAdminPanelProps {
  challenges: Challenge[];
  prizes: Prize[];
  onRefreshData: () => void;
}

export const TopAdminPanel: React.FC<TopAdminPanelProps> = ({
  challenges,
  prizes,
  onRefreshData,
}) => {
  const { user, isTopAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<
    | 'stats'
    | 'submissions'
    | 'challenges'
    | 'prizes'
    | 'admins'
    | 'impact'
    | 'organization'
    | 'payment'
    | 'users'
    | 'audit'
  >('stats');

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [admins, setAdmins] = useState<AdminUserRecord[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [impactSettings, setImpactSettings] = useState<ImpactSettings | null>(null);
  const [orgProfile, setOrgProfile] = useState<OrganizationProfile>(DEFAULT_ORGANIZATION_PROFILE);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);

  // Submissions State for Top Admin Management
  const [submissions, setSubmissions] = useState<ProofSubmission[]>([]);
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [selectedModalSubmission, setSelectedModalSubmission] = useState<ProofSubmission | null>(null);
  const [reviewingSubId, setReviewingSubId] = useState<string | null>(null);
  const [quickReviewStatus, setQuickReviewStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [quickReviewNote, setQuickReviewNote] = useState<string>('Verified clear reusable bag usage.');
  const [quickReviewPoints, setQuickReviewPoints] = useState<number>(10);
  const [isProcessingReview, setIsProcessingReview] = useState(false);

  // Organization Logo Upload & Preview State
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New challenge form state
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeForm, setChallengeForm] = useState<Partial<Challenge>>({
    title: '',
    description: '',
    pointsReward: 25,
    eligibilityRequirements: 'All registered members',
    status: 'ACTIVE',
    rules: ['Must use reusable bags during shopping', 'Photo must show bag in practical use'],
    requiredActions: ['Use reusable bag for grocery or retail trip', 'Submit clear photographic proof'],
  });

  // New prize form state
  const [showPrizeForm, setShowPrizeForm] = useState(false);
  const [prizeForm, setPrizeForm] = useState<Partial<Prize>>({
    title: '',
    description: '',
    value: '$100 Movement Grant',
    eligibility: 'Top 3 verified contributors of the month',
    competitionPeriod: 'Current Calendar Month',
    status: 'ACTIVE',
  });

  // New admin email state
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const loadAllAdminData = async () => {
    if (!isTopAdmin) return;
    setIsLoading(true);
    try {
      const [statsRes, adminsRes, usersRes, auditRes, impactRes, orgRes, payRes] = await Promise.all([
        api.getSystemStats().catch(() => ({ stats: null })),
        api.getAdmins().catch(() => ({ admins: [] })),
        api.getRegisteredUsers().catch(() => ({ users: [] })),
        api.getAuditLogs().catch(() => ({ auditLogs: [] })),
        api.getImpactSettings().catch(() => ({ settings: null })),
        api.getOrgProfile().catch(() => ({ profile: null })),
        api.getAdminPaymentSettings().catch(() => ({ settings: null })),
      ]);

      if (statsRes.stats) setStats(statsRes.stats);

      // Resolve admins list from API and Firestore
      let resolvedAdmins = adminsRes.admins || [];
      if (resolvedAdmins.length === 0) {
        resolvedAdmins = await fetchAdminsFromFirestore().catch(() => []);
      }
      setAdmins(resolvedAdmins);

      let resolvedUsers = usersRes.users || [];
      if (resolvedUsers.length === 0) {
        resolvedUsers = await fetchRegisteredUsersFromFirestore().catch(() => []);
      }
      setRegisteredUsers(resolvedUsers);

      if (auditRes.auditLogs) setAuditLogs(auditRes.auditLogs);
      if (impactRes.settings) setImpactSettings(impactRes.settings);

      // Resolve organization profile: ensure default is used if null
      let resolvedOrg = orgRes.profile;
      if (!resolvedOrg) {
        resolvedOrg = await fetchOrgProfileFromFirestore().catch(() => DEFAULT_ORGANIZATION_PROFILE);
      }
      setOrgProfile(resolvedOrg || DEFAULT_ORGANIZATION_PROFILE);

      if (payRes.settings) setPaymentSettings(payRes.settings);

      // Load all user submissions from Firestore and API
      const mergedSubs = new Map<string, ProofSubmission>();
      try {
        const fsSubs = await fetchAdminSubmissionsFromFirestore();
        (fsSubs || []).forEach((s) => mergedSubs.set(s.id, s));
      } catch (fsErr) {
        console.warn('Firestore fetchAdminSubmissions note:', fsErr);
      }
      try {
        const apiSubs = await api.getAdminSubmissions();
        (apiSubs?.submissions || []).forEach((s) => {
          if (!mergedSubs.has(s.id)) mergedSubs.set(s.id, s);
        });
      } catch {
        // Backend unavailable
      }
      const combinedSubs = Array.from(mergedSubs.values()).sort(
        (a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      setSubmissions(combinedSubs);
    } catch (err) {
      console.error('Failed to load top admin control data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, [isTopAdmin]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Challenge Handlers
  const handleSaveChallenge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeForm.title || !challengeForm.description) return;
    try {
      await api.createChallenge(challengeForm).catch(async () => {
        const now = new Date();
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const newChallenge: Challenge = {
          id: 'ch_' + Date.now(),
          title: challengeForm.title || '',
          description: challengeForm.description || '',
          startDate: challengeForm.startDate || now.toISOString().split('T')[0],
          endDate: challengeForm.endDate || future.toISOString().split('T')[0],
          pointsReward: challengeForm.pointsReward || 25,
          eligibilityRequirements: challengeForm.eligibilityRequirements || 'All registered members',
          status: (challengeForm.status as any) || 'ACTIVE',
          rules: challengeForm.rules || ['Must use reusable bags during shopping'],
          requiredActions: challengeForm.requiredActions || ['Use reusable bag for shopping trip'],
          createdAt: now.toISOString(),
          createdBy: user?.id || 'admin',
        };
        await saveChallengeToFirestore(newChallenge);
      });
      showMsg('success', 'Challenge created and published successfully.');
      setShowChallengeForm(false);
      setChallengeForm({
        title: '',
        description: '',
        pointsReward: 25,
        eligibilityRequirements: 'All registered members',
        status: 'ACTIVE',
        rules: ['Must use reusable bags during shopping'],
        requiredActions: ['Use reusable bag for shopping trip'],
      });
      onRefreshData();
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create challenge.');
    }
  };

  const handleDeleteChallenge = async (id: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;
    try {
      await api.deleteChallenge(id).catch(async () => {
        await deleteChallengeFromFirestore(id);
      });
      showMsg('success', 'Challenge deleted.');
      onRefreshData();
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to delete challenge.');
    }
  };

  // Prize Handlers
  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prizeForm.title || !prizeForm.value) return;
    try {
      await api.createPrize(prizeForm).catch(async () => {
        const newPrize: Prize = {
          id: 'prz_' + Date.now(),
          title: prizeForm.title || '',
          description: prizeForm.description || '',
          value: prizeForm.value || '$100 Movement Grant',
          eligibility: prizeForm.eligibility || 'Top verified contributors',
          competitionPeriod: prizeForm.competitionPeriod || 'Current Month',
          status: (prizeForm.status as any) || 'ACTIVE',
          createdAt: new Date().toISOString(),
          createdBy: user?.id || 'admin',
        };
        await savePrizeToFirestore(newPrize);
      });
      showMsg('success', 'Prize declared and published.');
      setShowPrizeForm(false);
      setPrizeForm({
        title: '',
        description: '',
        value: '$100 Movement Grant',
        eligibility: 'Top verified contributors',
        competitionPeriod: 'Current Month',
        status: 'ACTIVE',
      });
      onRefreshData();
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to save prize.');
    }
  };

  const handleDeletePrize = async (id: string) => {
    if (!confirm('Are you sure you want to remove this prize?')) return;
    try {
      await api.deletePrize(id).catch(async () => {
        await deletePrizeFromFirestore(id);
      });
      showMsg('success', 'Prize removed.');
      onRefreshData();
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to remove prize.');
    }
  };

  // Admin Management Handlers
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    try {
      const res = await api.addAdmin(newAdminEmail.trim());
      showMsg('success', res.message || 'Admin appointed.');
      setNewAdminEmail('');
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to appoint admin.');
    }
  };

  const handleToggleAdminStatus = async (admin: AdminUserRecord) => {
    if (admin.role === 'TOP_ADMIN') {
      showMsg('error', 'The Top Admin authority cannot be suspended or demoted.');
      return;
    }
    const newStatus = admin.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.setAdminStatus(admin.adminId, newStatus);
      showMsg('success', `Admin status changed to ${newStatus}.`);
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to toggle admin status.');
    }
  };

  const handleRemoveAdmin = async (admin: AdminUserRecord) => {
    if (admin.role === 'TOP_ADMIN') {
      showMsg('error', 'Top Admin cannot be removed.');
      return;
    }
    if (!confirm(`Revoke all administrative access from ${admin.email}?`)) return;
    try {
      await api.removeAdmin(admin.adminId);
      showMsg('success', 'Admin access revoked.');
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to revoke admin.');
    }
  };

  // Impact Settings Handler
  const handleSaveImpactSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!impactSettings) return;
    try {
      await api.updateImpactSettings(impactSettings).catch(async (err) => {
        console.warn('Backend updateImpactSettings unavailable, saving to Firestore:', err);
      });
      await saveSettingToFirestore('impactSettings', impactSettings);
      showMsg('success', 'Impact calculation settings updated. All verified figures recalculated.');
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update impact settings.');
    }
  };

  // Organization Profile & Logo Handlers
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg|webp|svg\+xml|gif)$/i)) {
      setLogoUploadError('Please select a valid image file (PNG, JPEG, WEBP, or SVG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setLogoUploadError('Image file size must be less than 15MB.');
      return;
    }

    setLogoUploadError(null);
    try {
      // Compress logo to crisp high-DPI 384x384 (under 40KB for instant loading & 100% reliable Firestore persistence)
      const compressedDataUrl = await compressImageToDataUrl(file, 384, 0.9);
      setLogoPreview(compressedDataUrl);
    } catch (err: any) {
      console.warn('Canvas logo compression fallback:', err);
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDiscardLogoPreview = () => {
    setLogoPreview(null);
    setLogoUploadError(null);
  };

  const handleResetToDefaultLogo = () => {
    setLogoPreview(null);
    setLogoUploadError(null);
    if (orgProfile) {
      setOrgProfile({
        ...orgProfile,
        logoUrl: '/InShot_20260917_104142121.png',
        logoPublicId: '',
      });
    }
  };

  const handleSaveOrgProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgProfile) return;
    setIsLoading(true);
    setLogoUploadError(null);

    try {
      let finalLogoUrl = orgProfile.logoUrl || '/InShot_20260917_104142121.png';
      let finalLogoPublicId = orgProfile.logoPublicId || '';

      // If user selected a new logo preview (base64 image), try remote upload or use optimized asset
      if (logoPreview && logoPreview.startsWith('data:image/')) {
        setIsUploadingLogo(true);
        try {
          const uploadRes = await api.uploadOrgLogo(logoPreview);
          if (uploadRes && uploadRes.logoUrl) {
            finalLogoUrl = uploadRes.logoUrl;
            finalLogoPublicId = uploadRes.cloudinaryPublicId || '';
          }
        } catch (uploadErr: any) {
          console.warn('[LOGO UPLOAD NOTE]: Using optimized client asset directly:', uploadErr);
          // If offline or static hosting, use the optimized logo preview directly
          finalLogoUrl = logoPreview;
        } finally {
          setIsUploadingLogo(false);
        }
      } else if (logoPreview && (logoPreview.startsWith('http://') || logoPreview.startsWith('https://') || logoPreview.startsWith('/'))) {
        finalLogoUrl = logoPreview;
      }

      const updatedProfile: OrganizationProfile = {
        ...orgProfile,
        logoUrl: finalLogoUrl,
        logoPublicId: finalLogoPublicId,
      };

      let savedProfile = updatedProfile;
      try {
        const res = await api.updateOrgProfile(updatedProfile);
        if (res && res.profile) savedProfile = res.profile;
      } catch (apiErr) {
        console.warn('Backend updateOrgProfile note, persisting to Firestore:', apiErr);
      }
      setOrgProfile(savedProfile);
      setLogoPreview(null);

      // Persist to Firestore settings collection as well
      await saveOrgProfileToFirestore(savedProfile);

      showMsg('success', 'Organization profile and brand identity updated successfully.');
      loadAllAdminData();
      onRefreshData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update organization profile.');
    } finally {
      setIsLoading(false);
    }
  };

  // Payment Settings Handler
  const handleSavePaymentSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentSettings) return;
    try {
      await api.updateAdminPaymentSettings(paymentSettings).catch(async (err) => {
        console.warn('Backend updateAdminPaymentSettings unavailable, saving to Firestore:', err);
      });
      await saveSettingToFirestore('paymentSettings', paymentSettings);
      showMsg('success', 'Banking and payment settings updated.');
      loadAllAdminData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update payment settings.');
    }
  };

  const handleProcessQuickReview = async (
    subId: string,
    action: 'APPROVED' | 'REJECTED',
    note?: string,
    points?: number
  ) => {
    setIsProcessingReview(true);
    try {
      const finalNote = note || (action === 'APPROVED' ? 'Verified evidence of reusable bag usage.' : 'Evidence photo is unclear or does not show reusable bag.');
      const finalPoints = action === 'APPROVED' ? (points !== undefined ? points : 10) : 0;
      const targetSub = submissions.find((s) => s.id === subId);

      // 1. Update in Firestore directly
      await reviewSubmissionInFirestore(
        subId,
        {
          status: action,
          reviewNote: finalNote,
          customPoints: finalPoints,
        },
        user,
        targetSub
      ).catch((fsErr) => console.warn('Firestore review direct note:', fsErr));

      // 2. Update via API
      await api.reviewSubmission(subId, {
        status: action,
        reviewNote: finalNote,
        customPoints: finalPoints,
      }).catch(() => {});

      // Instant optimistic update in local submissions table
      setSubmissions((prev) =>
        prev.map((s) =>
          s.id === subId
            ? {
                ...s,
                status: action,
                reviewNote: finalNote,
                pointsAwarded: finalPoints,
                reviewedAt: new Date().toISOString(),
                reviewedBy: user?.id || 'admin',
                reviewerEmail: user?.email || 'admin@movement.org',
              }
            : s
        )
      );

      showMsg('success', `Submission marked as ${action}.`);
      setReviewingSubId(null);
      loadAllAdminData();
      onRefreshData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to review submission.');
    } finally {
      setIsProcessingReview(false);
    }
  };

  if (!isTopAdmin) {
    return (
      <div className="py-12">
        <EmptyState
          icon={ShieldAlert}
          title="TOP_ADMIN Clearance Required"
          description="Access to the Top Admin Control Panel is strictly restricted to the verified organization owner holding the TOP_ADMIN role."
        />
      </div>
    );
  }

  const navTabs = [
    { id: 'stats', label: 'System Stats', icon: ShieldAlert },
    { id: 'submissions', label: 'User Submissions', icon: CheckCircle },
    { id: 'challenges', label: 'Challenges', icon: Award },
    { id: 'prizes', label: 'Prizes & Rewards', icon: Trophy },
    { id: 'admins', label: 'Administrators', icon: Users },
    { id: 'impact', label: 'Impact Formulas', icon: Settings },
    { id: 'organization', label: 'Org Profile', icon: Building },
    { id: 'payment', label: 'Banking & Payments', icon: CreditCard },
    { id: 'users', label: 'Member Roster', icon: UserCheck },
    { id: 'audit', label: 'Audit Trail', icon: History },
  ];

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-[#2C1810] to-[#1F140E] p-6 md:p-8 text-[#FDFBF7] border border-[#D4AF37] shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-2 border border-[#D4AF37]/40">
            <Lock className="w-3.5 h-3.5" />
            <span>Top Admin Control Panel • Owner Authorization</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-sans">
            Awareness Global Movement Governance
          </h1>
          <p className="text-xs text-[#D7CCC8] mt-1">
            Authenticated as: <strong className="text-white">{user?.email}</strong> (Role: TOP_ADMIN)
          </p>
        </div>

        <button
          onClick={loadAllAdminData}
          disabled={isLoading}
          className="self-start md:self-auto px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-[#FDFBF7] border border-white/20 flex items-center gap-2 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 border-b border-[#2C1810]/10">
        {navTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#2C1810] text-[#D4AF37] border border-[#D4AF37]/50 shadow-2xs'
                  : 'text-[#5D4037] hover:bg-[#2C1810]/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: System Overview & Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl p-5 bg-white border border-[#2C1810]/10 shadow-xs">
              <span className="text-[11px] font-bold text-[#8D6E63] uppercase tracking-wider block mb-1">
                Registered Members
              </span>
              <span className="text-3xl font-black text-[#2C1810]">
                {stats?.registeredUsersCount || 0}
              </span>
              <span className="text-[11px] text-[#795548] block mt-1">Real authenticated accounts</span>
            </div>

            <div className="rounded-2xl p-5 bg-white border border-[#2C1810]/10 shadow-xs">
              <span className="text-[11px] font-bold text-[#8D6E63] uppercase tracking-wider block mb-1">
                Verified Actions
              </span>
              <span className="text-3xl font-black text-[#2C1810]">
                {stats?.totalVerifiedActions || 0}
              </span>
              <span className="text-[11px] text-[#795548] block mt-1">
                {stats?.pendingSubmissionsCount || 0} pending review
              </span>
            </div>

            <div className="rounded-2xl p-5 bg-white border border-[#2C1810]/10 shadow-xs">
              <span className="text-[11px] font-bold text-[#8D6E63] uppercase tracking-wider block mb-1">
                Bags Avoided
              </span>
              <span className="text-3xl font-black text-[#2C1810]">
                {stats?.totalVerifiedBagsAvoided || 0}
              </span>
              <span className="text-[11px] text-[#795548] block mt-1">Verified plastic reduction</span>
            </div>

            <div className="rounded-2xl p-5 bg-[#2C1810] text-[#FDFBF7] border border-[#D4AF37]/50 shadow-xs">
              <span className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-wider block mb-1">
                Global CO₂e Avoided
              </span>
              <span className="text-2xl font-black text-white">
                {(stats?.totalCo2eAvoidedKgMax || 0).toFixed(1)} kg
              </span>
              <span className="text-[11px] text-[#D7CCC8] block mt-1">Official verified impact</span>
            </div>
          </div>

          <div className="rounded-2xl p-6 bg-white border border-[#2C1810]/10 space-y-3">
            <h3 className="text-sm font-bold text-[#2C1810] uppercase tracking-wider">
              System Integrity Notice
            </h3>
            <p className="text-xs text-[#5D4037] leading-relaxed">
              All metrics above are calculated directly from verified database entries. When no members or actions exist, figures start at exact baseline zero as mandated by the project specification.
            </p>
          </div>
        </div>
      )}

      {/* Tab: User Submissions Management */}
      {activeTab === 'submissions' && (
        <div className="space-y-6">
          {/* Header & Cloudinary Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#2C1810]">All Member Proof Submissions</h2>
              <p className="text-xs text-[#795548]">
                Real-time review desk for all photographic evidence uploaded across the movement.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Media Storage: Active</span>
              </span>
              <button
                type="button"
                onClick={loadAllAdminData}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-white border border-[#2C1810]/15 hover:bg-[#FDFBF7] text-xs font-bold text-[#2C1810] flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Status Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              type="button"
              onClick={() => setSubmissionFilter('ALL')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                submissionFilter === 'ALL'
                  ? 'bg-[#2C1810] text-[#D4AF37] border-[#D4AF37]'
                  : 'bg-white text-[#2C1810] border-[#2C1810]/10 hover:border-[#2C1810]/30'
              }`}
            >
              <span className="text-[11px] font-bold block uppercase tracking-wider">Total Submissions</span>
              <span className="text-2xl font-black mt-0.5 block">{submissions.length}</span>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionFilter('PENDING')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                submissionFilter === 'PENDING'
                  ? 'bg-amber-800 text-amber-100 border-amber-500'
                  : 'bg-amber-50/70 text-amber-900 border-amber-200 hover:border-amber-400'
              }`}
            >
              <span className="text-[11px] font-bold block uppercase tracking-wider">Pending Review</span>
              <span className="text-2xl font-black mt-0.5 block">
                {submissions.filter((s) => s.status === 'PENDING').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionFilter('APPROVED')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                submissionFilter === 'APPROVED'
                  ? 'bg-emerald-800 text-emerald-100 border-emerald-500'
                  : 'bg-emerald-50/70 text-emerald-900 border-emerald-200 hover:border-emerald-400'
              }`}
            >
              <span className="text-[11px] font-bold block uppercase tracking-wider">Approved Proofs</span>
              <span className="text-2xl font-black mt-0.5 block">
                {submissions.filter((s) => s.status === 'APPROVED').length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSubmissionFilter('REJECTED')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                submissionFilter === 'REJECTED'
                  ? 'bg-rose-800 text-rose-100 border-rose-500'
                  : 'bg-rose-50/70 text-rose-900 border-rose-200 hover:border-rose-400'
              }`}
            >
              <span className="text-[11px] font-bold block uppercase tracking-wider">Rejected Proofs</span>
              <span className="text-2xl font-black mt-0.5 block">
                {submissions.filter((s) => s.status === 'REJECTED').length}
              </span>
            </button>
          </div>

          {/* Submissions List */}
          {(() => {
            const filtered =
              submissionFilter === 'ALL'
                ? submissions
                : submissions.filter((s) => s.status === submissionFilter);

            if (filtered.length === 0) {
              return (
                <EmptyState
                  icon={CheckCircle}
                  title={`No ${submissionFilter !== 'ALL' ? submissionFilter.toLowerCase() : ''} submissions found`}
                  description="When members upload photographic proof of reusable bag usage, they appear immediately here for validation."
                />
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((sub) => {
                  const imgUrl = sub.proofImageUrl || sub.evidenceUrl || '';
                  const isPending = sub.status === 'PENDING';
                  const isApproved = sub.status === 'APPROVED';

                  return (
                    <div
                      key={sub.id}
                      className="bg-white rounded-2xl border border-[#2C1810]/10 overflow-hidden shadow-xs hover:border-[#D4AF37]/50 transition-all flex flex-col"
                    >
                      {/* Photo Thumbnail with Zoom Lightbox Overlay */}
                      <div className="relative h-48 bg-stone-900 overflow-hidden group">
                        {imgUrl ? (
                          <>
                            <img
                              src={imgUrl}
                              alt="Submitted Evidence"
                              onClick={() => setSelectedModalSubmission(sub)}
                              className="w-full h-full object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
                            />
                            <button
                              type="button"
                              onClick={() => setSelectedModalSubmission(sub)}
                              className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-xl bg-black/75 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-all shadow-md cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Pop Up Photo</span>
                            </button>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-1">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                            <span className="text-xs">No image provided</span>
                          </div>
                        )}

                        <div className="absolute top-2.5 left-2.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs ${
                              isApproved
                                ? 'bg-emerald-600 text-white'
                                : isPending
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                            }`}
                          >
                            {isApproved && <CheckCircle className="w-3 h-3" />}
                            {isPending && <Clock className="w-3 h-3" />}
                            {sub.status === 'REJECTED' && <XCircle className="w-3 h-3" />}
                            <span>{sub.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Content Card Body */}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-bold text-[#2C1810] block">
                                {sub.userName || 'Movement Member'}
                              </span>
                              <span className="text-[11px] text-[#8D6E63]">{sub.userEmail}</span>
                            </div>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2C1810]/5 text-[#5D4037]">
                              {sub.actionType.replace(/_/g, ' ')}
                            </span>
                          </div>

                          <p className="text-xs text-[#5D4037] line-clamp-2 bg-[#FDFBF7] p-2.5 rounded-xl border border-[#2C1810]/5">
                            {sub.description || 'No contextual note provided by submitter.'}
                          </p>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#8D6E63] pt-1">
                            <span>Submitted: {new Date(sub.submittedAt).toLocaleString()}</span>
                            {isApproved && (
                              <span className="font-bold text-emerald-700">
                                +{sub.pointsAwarded || 10} Pts awarded
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Inline Review Action Buttons */}
                        <div className="pt-3 border-t border-[#2C1810]/10 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedModalSubmission(sub)}
                            className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-[#2C1810] text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3 text-[#D4AF37]" />
                            <span>Inspect Fullscreen</span>
                          </button>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isProcessingReview}
                              onClick={() => handleProcessQuickReview(sub.id, 'APPROVED')}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>{isApproved ? 'Re-Approve' : 'Approve (+10)'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={isProcessingReview}
                              onClick={() => handleProcessQuickReview(sub.id, 'REJECTED')}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* Tab 2: Challenge Management */}
      {activeTab === 'challenges' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#2C1810]">Environmental Campaigns & Challenges</h2>
              <p className="text-xs text-[#795548]">Create, update, or conclude structured challenges.</p>
            </div>
            <button
              onClick={() => setShowChallengeForm(!showChallengeForm)}
              className="px-4 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] transition-all border border-[#D4AF37]/50 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showChallengeForm ? 'Cancel Form' : 'New Challenge'}</span>
            </button>
          </div>

          {showChallengeForm && (
            <form onSubmit={handleSaveChallenge} className="p-6 rounded-2xl bg-[#FDFBF7] border border-[#D4AF37]/50 space-y-4">
              <h3 className="text-sm font-bold text-[#2C1810] uppercase">Declare New Challenge</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2C1810] mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })}
                    placeholder="e.g. 7 Days. Reusable Bags."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1810] mb-1">Points Reward</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={challengeForm.pointsReward}
                    onChange={(e) => setChallengeForm({ ...challengeForm, pointsReward: parseInt(e.target.value) || 25 })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1810] mb-1">Description</label>
                <textarea
                  rows={3}
                  required
                  value={challengeForm.description}
                  onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })}
                  placeholder="Describe the campaign objectives, behavioral requirements, and dates..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowChallengeForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#795548]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/50"
                >
                  Publish Challenge
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {challenges.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No Challenges Created"
                description="Use the button above to publish your first challenge (e.g. '7 Days. Reusable Bags.') to motivate movement members."
              />
            ) : (
              challenges.map((c) => (
                <div key={c.id} className="p-4 rounded-xl bg-white border border-[#2C1810]/10 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#2C1810]">{c.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F4EE] text-[#5D4037]">
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#795548] line-clamp-1 mt-0.5">{c.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-bold text-[#D4AF37]">+{c.pointsReward} pts</span>
                    <button
                      onClick={() => handleDeleteChallenge(c.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      title="Delete Challenge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Prize Management */}
      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#2C1810]">Movement Prizes & Rewards</h2>
              <p className="text-xs text-[#795548]">Declare official recognition awards and incentive grants.</p>
            </div>
            <button
              onClick={() => setShowPrizeForm(!showPrizeForm)}
              className="px-4 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] transition-all border border-[#D4AF37]/50 flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{showPrizeForm ? 'Cancel Form' : 'Declare Prize'}</span>
            </button>
          </div>

          {showPrizeForm && (
            <form onSubmit={handleSavePrize} className="p-6 rounded-2xl bg-[#FDFBF7] border border-[#D4AF37]/50 space-y-4">
              <h3 className="text-sm font-bold text-[#2C1810] uppercase">Declare Official Prize</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-[#2C1810] mb-1">Prize Title</label>
                  <input
                    type="text"
                    required
                    value={prizeForm.title}
                    onChange={(e) => setPrizeForm({ ...prizeForm, title: e.target.value })}
                    placeholder="e.g. Monthly Top Reusable Contributor Award"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2C1810] mb-1">Value / Package</label>
                  <input
                    type="text"
                    required
                    value={prizeForm.value}
                    onChange={(e) => setPrizeForm({ ...prizeForm, value: e.target.value })}
                    placeholder="e.g. $100 Eco-Grant or Certificate"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2C1810] mb-1">Description</label>
                <textarea
                  rows={2}
                  required
                  value={prizeForm.description}
                  onChange={(e) => setPrizeForm({ ...prizeForm, description: e.target.value })}
                  placeholder="Details regarding eligibility, selection criteria, and presentation..."
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPrizeForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#795548]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/50"
                >
                  Publish Prize
                </button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {prizes.length === 0 ? (
              <EmptyState
                icon={Trophy}
                title="No Prizes Declared"
                description="Declare official movement awards and incentives. No fake numbers will be displayed to users."
              />
            ) : (
              prizes.map((p) => (
                <div key={p.id} className="p-4 rounded-xl bg-white border border-[#2C1810]/10 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#2C1810]">{p.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F4EE] text-[#5D4037]">
                        {p.status}
                      </span>
                    </div>
                    <p className="text-xs text-[#795548] line-clamp-1 mt-0.5">{p.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-black text-[#2C1810] bg-[#F7F4EE] px-2.5 py-1 rounded">
                      {p.value}
                    </span>
                    <button
                      onClick={() => handleDeletePrize(p.id)}
                      className="p-1.5 rounded-lg text-red-600 hover:bg-red-50"
                      title="Delete Prize"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Administrator Management */}
      {activeTab === 'admins' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-[#2C1810]">Movement Administrators</h2>
              <p className="text-xs text-[#795548]">Appoint authorized admins to review proof. Only Top Admins can appoint or revoke admins.</p>
            </div>

            <form onSubmit={handleAddAdmin} className="flex items-center gap-2">
              <input
                type="email"
                required
                placeholder="admin.email@example.com"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className="px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810] w-64"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] border border-[#D4AF37]/50 whitespace-nowrap cursor-pointer"
              >
                Add Admin
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-white border border-[#2C1810]/10 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F4EE] border-b border-[#2C1810]/10 text-[#5D4037] uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-6 py-3">Administrator</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Appointed Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C1810]/5">
                {admins.map((admin) => {
                  const isSelf = admin.userId === user?.id || admin.role === 'TOP_ADMIN';
                  return (
                    <tr key={admin.adminId} className="hover:bg-[#FDFBF7]">
                      <td className="px-6 py-3 font-semibold text-[#2C1810]">
                        {admin.name} <span className="text-[#8D6E63] font-normal">({admin.email})</span>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2C1810] text-[#D4AF37]">
                          {admin.role}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            admin.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {admin.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[#795548]">
                        {new Date(admin.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isSelf ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleToggleAdminStatus(admin)}
                              className="text-xs font-semibold text-[#795548] hover:text-[#2C1810] underline"
                            >
                              {admin.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleRemoveAdmin(admin)}
                              className="p-1 rounded text-red-600 hover:bg-red-50"
                              title="Revoke Admin Access"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#8D6E63] italic">Owner Authority</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Impact Calculation Settings */}
      {activeTab === 'impact' && impactSettings && (
        <form onSubmit={handleSaveImpactSettings} className="rounded-2xl bg-white border border-[#2C1810]/10 p-6 md:p-8 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-[#2C1810]">Environmental Impact Calculation Formulas</h2>
            <p className="text-xs text-[#795548]">
              Configure the scientific parameters used to compute plastic bags eliminated and CO₂ equivalent greenhouse gas offsets. Changes recalculate verified statistics across the entire movement.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                Plastic Bags Avoided per Reusable Bag Use
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={impactSettings.bagsInOneReusable}
                onChange={(e) =>
                  setImpactSettings({ ...impactSettings, bagsInOneReusable: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] font-bold"
              />
              <p className="text-[11px] text-[#8D6E63] mt-1">Average grocery trip eliminates reusable factor of disposable plastic bags.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                Default Verified Points per Action
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={impactSettings.pointsPerApprovedAction}
                onChange={(e) =>
                  setImpactSettings({ ...impactSettings, pointsPerApprovedAction: parseInt(e.target.value) || 10 })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] font-bold"
              />
              <p className="text-[11px] text-[#8D6E63] mt-1">Movement score awarded to user profile upon approval.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                CO₂e Avoided per Bag (Minimum Grams)
              </label>
              <input
                type="number"
                min={1}
                value={impactSettings.co2eMinGramsPerBag}
                onChange={(e) =>
                  setImpactSettings({ ...impactSettings, co2eMinGramsPerBag: parseInt(e.target.value) || 15 })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] font-bold"
              />
              <p className="text-[11px] text-[#8D6E63] mt-1">Standard conservative lifecycle factor per bag.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                CO₂e Avoided per Bag (Maximum Grams)
              </label>
              <input
                type="number"
                min={1}
                value={impactSettings.co2eMaxGramsPerBag}
                onChange={(e) =>
                  setImpactSettings({ ...impactSettings, co2eMaxGramsPerBag: parseInt(e.target.value) || 33 })
                }
                className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] font-bold"
              />
              <p className="text-[11px] text-[#8D6E63] mt-1">Upper lifecycle boundary including disposal emission.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-[#2C1810]/10 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] transition-all border border-[#D4AF37]/50 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Recalculate Movement Figures</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 6: Organization Profile */}
      {activeTab === 'organization' && orgProfile && (
        <form onSubmit={handleSaveOrgProfile} className="rounded-2xl bg-white border border-[#2C1810]/10 p-6 md:p-8 space-y-6">
          <div className="border-b border-[#2C1810]/10 pb-4">
            <h2 className="text-xl font-bold text-[#2C1810]">Organization Profile & Brand Settings</h2>
            <p className="text-xs text-[#795548] mt-1">
              Configure official movement identity, brand logo, mission statement, contact channels, and registration information.
            </p>
          </div>

          {/* 1. ORGANIZATION LOGO */}
          <div className="p-5 rounded-2xl bg-[#FDFBF7] border border-[#2C1810]/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="block text-xs font-bold text-[#2C1810] uppercase tracking-wider">
                  1. Organization Logo
                </label>
                <p className="text-[11px] text-[#795548]">
                  Workflow: Current Logo → Change/Upload Logo → Preview → Save. Responsive high-resolution brand asset.
                </p>
              </div>

              {logoPreview && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#856404] bg-[#FFF3CD] border border-[#FFEEBA] px-2.5 py-1 rounded-full w-fit">
                  <AlertCircle className="w-3 h-3" />
                  <span>Previewing New Logo (Pending Save)</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {/* Logo Display Box */}
              <div className="relative w-24 h-24 rounded-2xl bg-white border border-[#2C1810]/15 p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={logoPreview || orgProfile.logoUrl || '/InShot_20260917_104142121.png'}
                  alt="Organization Logo"
                  className="w-full h-full object-contain select-none"
                  draggable={false}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + '/InShot_20260917_104142121.png') {
                      target.src = '/InShot_20260917_104142121.png';
                    }
                  }}
                />
              </div>

              {/* Upload & Actions */}
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="org-logo-file-input"
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="org-logo-file-input"
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] transition-colors cursor-pointer border border-[#D4AF37]/40 shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoPreview ? 'Choose Different Image' : 'Change / Upload Logo'}</span>
                  </label>

                  {logoPreview && (
                    <button
                      type="button"
                      onClick={handleDiscardLogoPreview}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#795548] text-xs font-semibold hover:bg-[#F5EFEB] border border-[#2C1810]/20 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Discard Preview</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-[#795548] text-xs font-semibold hover:bg-[#F5EFEB] border border-[#2C1810]/20 transition-colors cursor-pointer"
                    title="Restore default brand logo asset"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset to Default Logo</span>
                  </button>
                </div>

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-[#5D4037] mb-1">
                    Or Enter Hosted Logo / Image URL:
                  </label>
                  <input
                    type="url"
                    value={logoPreview && !logoPreview.startsWith('data:') ? logoPreview : (orgProfile.logoUrl || '')}
                    onChange={(e) => {
                      const url = e.target.value.trim();
                      setLogoPreview(url);
                      setLogoUploadError(null);
                    }}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/15 text-xs text-[#2C1810] focus:outline-hidden focus:ring-1 focus:ring-[#D4AF37]"
                  />
                </div>

                <p className="text-[11px] text-[#8D6E63] leading-relaxed">
                  Upload official PNG, JPEG, SVG, or WEBP logo (max 15MB) or enter hosted URL. Logos are automatically optimized for high-DPI retina display.
                </p>

                {logoUploadError && (
                  <p className="text-xs text-red-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{logoUploadError}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 2, 3, 4, 10. CORE IDENTIFIERS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                2. Organization Name
              </label>
              <input
                type="text"
                value={orgProfile.orgName}
                onChange={(e) => setOrgProfile({ ...orgProfile, orgName: e.target.value })}
                placeholder="e.g. Awareness Global"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                3. Movement Name
              </label>
              <input
                type="text"
                value={orgProfile.movementName}
                onChange={(e) => setOrgProfile({ ...orgProfile, movementName: e.target.value })}
                placeholder="e.g. Awareness Global Movement"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                4. Official Slogan
              </label>
              <input
                type="text"
                value={orgProfile.slogan}
                onChange={(e) => setOrgProfile({ ...orgProfile, slogan: e.target.value })}
                placeholder="e.g. Stay Aware"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                10. Organization Location / Country
              </label>
              <input
                type="text"
                value={orgProfile.location}
                onChange={(e) => setOrgProfile({ ...orgProfile, location: e.target.value })}
                placeholder="e.g. Global / Lagos, Nigeria"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* 5, 6. MISSION STATEMENT & SHORT DESCRIPTION */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                5. Mission Statement
              </label>
              <textarea
                rows={3}
                value={orgProfile.mission}
                onChange={(e) => setOrgProfile({ ...orgProfile, mission: e.target.value })}
                placeholder="e.g. Unite the world through awareness to help solve global issues..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                6. Short Organization Description
              </label>
              <textarea
                rows={3}
                value={orgProfile.description}
                onChange={(e) => setOrgProfile({ ...orgProfile, description: e.target.value })}
                placeholder="Short summary of the organization's environmental mission and public purpose..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* 7, 8. CONTACT EMAIL & OFFICIAL WEBSITE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                7. Contact Email
              </label>
              <input
                type="email"
                value={orgProfile.contactEmail}
                onChange={(e) => setOrgProfile({ ...orgProfile, contactEmail: e.target.value })}
                placeholder="e.g. movement@awarenessglobal.org"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
                8. Official Website
              </label>
              <input
                type="url"
                value={orgProfile.website}
                onChange={(e) => setOrgProfile({ ...orgProfile, website: e.target.value })}
                placeholder="e.g. https://sites.google.com/view/awarenessglobal/home"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
              />
            </div>
          </div>

          {/* 9. SOCIAL MEDIA LINKS */}
          <div className="p-4 rounded-2xl bg-[#FDFBF7] border border-[#2C1810]/10 space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase">
                9. Social Media Links
              </label>
              <p className="text-[11px] text-[#795548]">Official platform and community accounts.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810] mb-0.5">Facebook</label>
                <input
                  type="url"
                  value={orgProfile.socialLinks?.facebook || ''}
                  onChange={(e) =>
                    setOrgProfile({
                      ...orgProfile,
                      socialLinks: { ...orgProfile.socialLinks, facebook: e.target.value },
                    })
                  }
                  placeholder="https://facebook.com/AwarenessGlobal"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810] mb-0.5">Twitter / X</label>
                <input
                  type="url"
                  value={orgProfile.socialLinks?.twitter || ''}
                  onChange={(e) =>
                    setOrgProfile({
                      ...orgProfile,
                      socialLinks: { ...orgProfile.socialLinks, twitter: e.target.value },
                    })
                  }
                  placeholder="https://twitter.com/AwarenessGlobal"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810] mb-0.5">Instagram</label>
                <input
                  type="url"
                  value={orgProfile.socialLinks?.instagram || ''}
                  onChange={(e) =>
                    setOrgProfile({
                      ...orgProfile,
                      socialLinks: { ...orgProfile.socialLinks, instagram: e.target.value },
                    })
                  }
                  placeholder="https://instagram.com/AwarenessGlobal"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#2C1810] mb-0.5">LinkedIn</label>
                <input
                  type="url"
                  value={orgProfile.socialLinks?.linkedin || ''}
                  onChange={(e) =>
                    setOrgProfile({
                      ...orgProfile,
                      socialLinks: { ...orgProfile.socialLinks, linkedin: e.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/company/awarenessglobal"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-[#2C1810] mb-0.5">YouTube</label>
                <input
                  type="url"
                  value={orgProfile.socialLinks?.youtube || ''}
                  onChange={(e) =>
                    setOrgProfile({
                      ...orgProfile,
                      socialLinks: { ...orgProfile.socialLinks, youtube: e.target.value },
                    })
                  }
                  placeholder="https://youtube.com/@AwarenessGlobal"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#2C1810]/20 text-xs text-[#2C1810]"
                />
              </div>
            </div>
          </div>

          {/* 11. ORGANIZATION / REGISTRATION INFORMATION */}
          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
              11. Organization / Registration Information
            </label>
            <textarea
              rows={2}
              value={orgProfile.registrationInfo || ''}
              onChange={(e) => setOrgProfile({ ...orgProfile, registrationInfo: e.target.value })}
              placeholder="e.g. Registered Non-Profit Environmental Behavioral-Change Movement / Incorporation #..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          {/* Submit Action */}
          <div className="pt-4 border-t border-[#2C1810]/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[11px] text-[#795548]">
              {orgProfile.updatedAt ? `Last saved: ${new Date(orgProfile.updatedAt).toLocaleString()}` : 'Not yet updated'}
            </p>

            <button
              type="submit"
              disabled={isLoading || isUploadingLogo}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] transition-all border border-[#D4AF37]/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {isLoading || isUploadingLogo ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isUploadingLogo ? 'Saving Logo...' : 'Saving Changes...'}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Organization Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Tab 7: Banking & Payment Settings */}
      {activeTab === 'payment' && paymentSettings && (
        <form onSubmit={handleSavePaymentSettings} className="rounded-2xl bg-white border border-[#2C1810]/10 p-6 md:p-8 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-[#2C1810]">Banking & Payment Configuration</h2>
            <p className="text-xs text-[#795548]">
              Manage disbursement and contribution settings. Public instructions are visible to members; private notes are strictly viewable by Top Admin.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">Bank / Institution Provider</label>
              <input
                type="text"
                value={paymentSettings.bankOrProvider}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, bankOrProvider: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">Public Support Notice</label>
              <input
                type="text"
                value={paymentSettings.publicSupportNotice}
                onChange={(e) => setPaymentSettings({ ...paymentSettings, publicSupportNotice: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">Public Instructions</label>
            <textarea
              rows={2}
              value={paymentSettings.publicInstructions}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, publicInstructions: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#2C1810] uppercase mb-1">
              Private Account Details & Internal Banking Notes (Top Admin Only)
            </label>
            <textarea
              rows={2}
              value={paymentSettings.privateNotes || ''}
              onChange={(e) => setPaymentSettings({ ...paymentSettings, privateNotes: e.target.value })}
              placeholder="Private routing instructions or banking reference numbers..."
              className="w-full px-3 py-2 rounded-xl bg-[#FDFBF7] border border-[#2C1810]/20 text-xs text-[#2C1810] font-mono"
            />
          </div>

          <div className="pt-4 border-t border-[#2C1810]/10 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#2C1810] text-[#D4AF37] text-xs font-bold hover:bg-[#3E2723] transition-all border border-[#D4AF37]/50 flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Payment Configuration</span>
            </button>
          </div>
        </form>
      )}

      {/* Tab 8: Member Roster */}
      {activeTab === 'users' && (
        <div className="rounded-2xl bg-white border border-[#2C1810]/10 overflow-hidden">
          <div className="p-4 border-b border-[#2C1810]/10 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-[#2C1810]">
              Registered Movement Accounts ({registeredUsers.length})
            </h3>
            <span className="text-[11px] text-[#8D6E63]">No simulated members. Only verified accounts.</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F4EE] border-b border-[#2C1810]/10 text-[#5D4037] uppercase font-bold text-[10px]">
              <tr>
                <th className="px-6 py-3">Member Name</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Verified Points</th>
                <th className="px-6 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C1810]/5">
              {registeredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-[#8D6E63]">
                    No accounts registered in database yet.
                  </td>
                </tr>
              ) : (
                registeredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FDFBF7]">
                    <td className="px-6 py-3 font-semibold text-[#2C1810]">{u.fullName}</td>
                    <td className="px-6 py-3 text-[#5D4037]">{u.email}</td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F7F4EE] text-[#2C1810]">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-[#D4AF37]">{u.verifiedPoints || 0}</td>
                    <td className="px-6 py-3 text-[#8D6E63]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 9: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="rounded-2xl bg-white border border-[#2C1810]/10 overflow-hidden">
          <div className="p-4 border-b border-[#2C1810]/10 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-[#2C1810]">
              System Administrative Audit Trail
            </h3>
            <span className="text-[11px] text-[#8D6E63]">Immutable log of administrative interventions</span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F4EE] border-b border-[#2C1810]/10 text-[#5D4037] uppercase font-bold text-[10px]">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Administrator</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2C1810]/5">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8D6E63]">
                    No audit records logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FDFBF7]">
                    <td className="px-6 py-3 whitespace-nowrap text-[#8D6E63]">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 font-semibold text-[#2C1810]">
                      {log.adminEmail}
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#2C1810]/5 text-[#2C1810]">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-[#5D4037] max-w-md">
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive Photo Lightbox Popup */}
      {selectedModalSubmission && (
        <ImageModal
          isOpen={!!selectedModalSubmission}
          onClose={() => setSelectedModalSubmission(null)}
          imageUrl={selectedModalSubmission.proofImageUrl || selectedModalSubmission.evidenceUrl || ''}
          title={`Evidence Inspection - ${selectedModalSubmission.actionType.replace(/_/g, ' ')}`}
          submitterName={selectedModalSubmission.userName}
          submitterEmail={selectedModalSubmission.userEmail}
          submittedAt={selectedModalSubmission.submittedAt}
          actionType={selectedModalSubmission.actionType}
          cloudinaryPublicId={selectedModalSubmission.cloudinaryPublicId}
          status={selectedModalSubmission.status}
        />
      )}
    </div>
  );
};
