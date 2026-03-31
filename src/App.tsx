import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
const ChatWidget = lazy(() => import("./components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const SocialProofPopup = lazy(() => import("./components/SocialProofPopup").then(m => ({ default: m.SocialProofPopup })));
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";

// Eagerly load the landing page for best FCP/LCP
import Index from "./pages/Index";

// Lazy-load everything else
const Contact = lazy(() => import("./pages/Contact"));
const SLA = lazy(() => import("./pages/SLA"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const Cookies = lazy(() => import("./pages/Cookies"));
const FAQ = lazy(() => import("./pages/FAQ"));
const LegalValidity = lazy(() => import("./pages/LegalValidity"));
const Partners = lazy(() => import("./pages/Partners"));
const Verify = lazy(() => import("./pages/Verify"));
const Distribution = lazy(() => import("./pages/Distribution"));
const Marketing = lazy(() => import("./pages/Marketing"));
const News = lazy(() => import("./pages/News"));
const NewsArticle = lazy(() => import("./pages/NewsArticle"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminBlog = lazy(() => import("./pages/AdminBlog"));
const AdminABTests = lazy(() => import("./pages/AdminABTests"));
const UserLogin = lazy(() => import("./pages/UserLogin"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DashboardLayout = lazy(() => import("./pages/DashboardLayout"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const VerifyPage = lazy(() => import("./pages/VerifyPage"));
const PromotePage = lazy(() => import("./pages/PromotePage"));
const CreditsPage = lazy(() => import("./pages/CreditsPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BillingPage = lazy(() => import("./pages/BillingPage"));
const SupportPage = lazy(() => import("./pages/SupportPage"));
const BlockchainEvidencePage = lazy(() => import("./pages/BlockchainEvidencePage"));
const IdentityVerificationPage = lazy(() => import("./pages/IdentityVerificationPage"));
const LaunchPage = lazy(() => import("./pages/LaunchPage"));
const AIStudio = lazy(() => import("./pages/AIStudio"));
const AIStudioCreate = lazy(() => import("./pages/AIStudioCreate"));
const AIStudioEdit = lazy(() => import("./pages/AIStudioEdit"));
const AIStudioInspire = lazy(() => import("./pages/AIStudioInspire"));
const AIStudioVideo = lazy(() => import("./pages/AIStudioVideo"));
const AIStudioCovers = lazy(() => import("./pages/AIStudioCovers"));
const AIStudioVocal = lazy(() => import("./pages/AIStudioVocal"));
const AdminGuard = lazy(() => import("./components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const ManagerGuard = lazy(() => import("./components/ManagerGuard").then(m => ({ default: m.ManagerGuard })));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminCreditsPage = lazy(() => import("./pages/AdminCreditsPage"));
const AdminWorksPage = lazy(() => import("./pages/AdminWorksPage"));
const AdminMetricsPage = lazy(() => import("./pages/AdminMetricsPage"));
const AdminSystemPage = lazy(() => import("./pages/AdminSystemPage"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const ManagerArtists = lazy(() => import("./pages/ManagerArtists"));
const ManagerArtistNew = lazy(() => import("./pages/ManagerArtistNew"));
const ManagerArtistDetail = lazy(() => import("./pages/ManagerArtistDetail"));
const ManagerWorks = lazy(() => import("./pages/ManagerWorks"));
const ManagerRegisterWork = lazy(() => import("./pages/ManagerRegisterWork"));
const ManagerLanding = lazy(() => import("./pages/ManagerLanding"));
const ArtistProfilesPage = lazy(() => import("./pages/ArtistProfilesPage"));
const VoiceCloningPage = lazy(() => import("./pages/VoiceCloningPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <ChatWidget />
          <SocialProofPopup />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/sla" element={<SLA />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/cookies" element={<Cookies />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/legal-validity" element={<LegalValidity />} />
              <Route path="/partners" element={<Partners />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/distribution" element={<Distribution />} />
              <Route path="/marketing" element={<Marketing />} />
              <Route path="/news" element={<News />} />
              <Route path="/news/:slug" element={<NewsArticle />} />
              <Route path="/admin" element={<AdminLogin />} />
              <Route path="/admin/blog" element={<AdminBlog />} />
              <Route path="/admin/ab-tests" element={<AdminABTests />} />
              <Route path="/manager" element={<ManagerLanding />} />
              <Route path="/login" element={<UserLogin />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<DashboardHome />} />
                <Route path="launch" element={<LaunchPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify" element={<VerifyPage />} />
                <Route path="promote" element={<PromotePage />} />
                <Route path="credits" element={<CreditsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="blockchain" element={<BlockchainEvidencePage />} />
                <Route path="verify-identity" element={<IdentityVerificationPage />} />
                <Route path="artist-profiles" element={<ArtistProfilesPage />} />
                <Route path="voice-cloning" element={<VoiceCloningPage />} />
                <Route path="admin/users" element={<Suspense fallback={null}><AdminGuard><AdminUsersPage /></AdminGuard></Suspense>} />
                <Route path="admin/credits" element={<Suspense fallback={null}><AdminGuard><AdminCreditsPage /></AdminGuard></Suspense>} />
                <Route path="admin/works" element={<Suspense fallback={null}><AdminGuard><AdminWorksPage /></AdminGuard></Suspense>} />
                <Route path="admin/metrics" element={<Suspense fallback={null}><AdminGuard><AdminMetricsPage /></AdminGuard></Suspense>} />
                <Route path="admin/system" element={<Suspense fallback={null}><AdminGuard><AdminSystemPage /></AdminGuard></Suspense>} />
                <Route path="manager" element={<Suspense fallback={null}><ManagerGuard><ManagerDashboard /></ManagerGuard></Suspense>} />
                <Route path="manager/artists" element={<Suspense fallback={null}><ManagerGuard><ManagerArtists /></ManagerGuard></Suspense>} />
                <Route path="manager/artists/new" element={<Suspense fallback={null}><ManagerGuard><ManagerArtistNew /></ManagerGuard></Suspense>} />
                <Route path="manager/artists/:artistId" element={<Suspense fallback={null}><ManagerGuard><ManagerArtistDetail /></ManagerGuard></Suspense>} />
                <Route path="manager/works" element={<Suspense fallback={null}><ManagerGuard><ManagerWorks /></ManagerGuard></Suspense>} />
                <Route path="manager/register" element={<Suspense fallback={null}><ManagerGuard><ManagerRegisterWork /></ManagerGuard></Suspense>} />
              </Route>
              <Route path="/ai-studio" element={<AIStudio />} />
              <Route path="/ai-studio/create" element={<AIStudioCreate />} />
              <Route path="/ai-studio/edit" element={<AIStudioEdit />} />
              <Route path="/ai-studio/inspire" element={<AIStudioInspire />} />
              <Route path="/ai-studio/video" element={<AIStudioVideo />} />
              <Route path="/ai-studio/covers" element={<AIStudioCovers />} />
              <Route path="/ai-studio/vocal" element={<AIStudioVocal />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
