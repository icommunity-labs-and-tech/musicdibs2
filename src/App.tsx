import { Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";
import { lazyWithRetry } from "./lib/lazyWithRetry";
import { preloadFeatureCosts } from "./lib/featureCosts";

// Preload feature costs from DB as early as possible
preloadFeatureCosts();

const ChatWidget = lazyWithRetry(() => import("./components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const SocialProofPopup = lazyWithRetry(() => import("./components/SocialProofPopup").then(m => ({ default: m.SocialProofPopup })));

// Eagerly load the landing page for best FCP/LCP
import Index from "./pages/Index";

// Lazy-load everything else
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const SLA = lazyWithRetry(() => import("./pages/SLA"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const Terms = lazyWithRetry(() => import("./pages/Terms"));
const Cookies = lazyWithRetry(() => import("./pages/Cookies"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const LegalValidity = lazyWithRetry(() => import("./pages/LegalValidity"));
const Partners = lazyWithRetry(() => import("./pages/Partners"));
const Verify = lazyWithRetry(() => import("./pages/Verify"));
const Distribution = lazyWithRetry(() => import("./pages/Distribution"));
const Marketing = lazyWithRetry(() => import("./pages/Marketing"));
const News = lazyWithRetry(() => import("./pages/News"));
const NewsArticle = lazyWithRetry(() => import("./pages/NewsArticle"));
const AdminLogin = lazyWithRetry(() => import("./pages/AdminLogin"));
const AdminBlog = lazyWithRetry(() => import("./pages/AdminBlog"));
const AdminABTests = lazyWithRetry(() => import("./pages/AdminABTests"));
const UserLogin = lazyWithRetry(() => import("./pages/UserLogin"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const DashboardLayout = lazyWithRetry(() => import("./pages/DashboardLayout"));
const DashboardHome = lazyWithRetry(() => import("./pages/DashboardHome"));
const RegisterPage = lazyWithRetry(() => import("./pages/RegisterPage"));
const VerifyPage = lazyWithRetry(() => import("./pages/VerifyPage"));
const PromotionPage = lazyWithRetry(() => import("./pages/PromotionPage"));
const CreditsPage = lazyWithRetry(() => import("./pages/CreditsPage"));
const ProfilePage = lazyWithRetry(() => import("./pages/ProfilePage"));
const BillingPage = lazyWithRetry(() => import("./pages/BillingPage"));
const SupportPage = lazyWithRetry(() => import("./pages/SupportPage"));
const BlockchainEvidencePage = lazyWithRetry(() => import("./pages/BlockchainEvidencePage"));
const IdentityVerificationPage = lazyWithRetry(() => import("./pages/IdentityVerificationPage"));
const LaunchPage = lazyWithRetry(() => import("./pages/LaunchPage"));
const AIStudio = lazyWithRetry(() => import("./pages/AIStudio"));
const AIStudioCreate = lazyWithRetry(() => import("./pages/AIStudioCreate"));
const AIStudioEdit = lazyWithRetry(() => import("./pages/AIStudioEdit"));
const AIStudioInspire = lazyWithRetry(() => import("./pages/AIStudioInspire"));
const AIStudioVideo = lazyWithRetry(() => import("./pages/AIStudioVideo"));
const AIStudioCovers = lazyWithRetry(() => import("./pages/AIStudioCovers"));
const AIStudioVocal = lazyWithRetry(() => import("./pages/AIStudioVocal"));
const PromoMaterial = lazyWithRetry(() => import("./pages/PromoMaterial"));
const AdminGuard = lazyWithRetry(() => import("./components/AdminGuard").then(m => ({ default: m.AdminGuard })));
const ManagerGuard = lazyWithRetry(() => import("./components/ManagerGuard").then(m => ({ default: m.ManagerGuard })));
const AdminUsersPage = lazyWithRetry(() => import("./pages/AdminUsersPage"));
const AdminCreditsPage = lazyWithRetry(() => import("./pages/AdminCreditsPage"));
const AdminWorksPage = lazyWithRetry(() => import("./pages/AdminWorksPage"));
const AdminMetricsPage = lazyWithRetry(() => import("./pages/AdminMetricsPage"));
const AdminSystemPage = lazyWithRetry(() => import("./pages/AdminSystemPage"));
const AdminPremiumPromosPage = lazyWithRetry(() => import("./pages/AdminPremiumPromosPage"));
const AdminFeatureCostsPage = lazyWithRetry(() => import("./pages/AdminFeatureCostsPage"));
const AdminApiCostsPage = lazyWithRetry(() => import("./pages/AdminApiCostsPage"));
const AdminProductMetrics = lazyWithRetry(() => import("./pages/AdminProductMetrics"));
const ManagerDashboard = lazyWithRetry(() => import("./pages/ManagerDashboard"));
const ManagerArtists = lazyWithRetry(() => import("./pages/ManagerArtists"));
const ManagerArtistNew = lazyWithRetry(() => import("./pages/ManagerArtistNew"));
const ManagerArtistDetail = lazyWithRetry(() => import("./pages/ManagerArtistDetail"));
const ManagerWorks = lazyWithRetry(() => import("./pages/ManagerWorks"));
const ManagerRegisterWork = lazyWithRetry(() => import("./pages/ManagerRegisterWork"));
const ManagerLanding = lazyWithRetry(() => import("./pages/ManagerLanding"));
const ArtistProfilesPage = lazyWithRetry(() => import("./pages/ArtistProfilesPage"));
const MediaLibraryPage = lazyWithRetry(() => import("./pages/MediaLibraryPage"));
const PressPage = lazyWithRetry(() => import("./pages/PressPage"));

const AdminCampaignMetricsPage = lazyWithRetry(() => import("./pages/AdminCampaignMetricsPage"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Capture UTM attribution on first load
import { captureAttribution } from "@/lib/attribution";

const AppInit = () => {
  useEffect(() => { captureAttribution(); }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <AppInit />
          <Suspense fallback={null}>
            <ChatWidget />
            <SocialProofPopup />
          </Suspense>
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
                <Route path="promote" element={<PromotionPage />} />
                <Route path="premium-promotion" element={<PromotionPage />} />
                <Route path="promotion" element={<PromotionPage />} />
                <Route path="press" element={<PromotionPage />} />
                <Route path="credits" element={<CreditsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="support" element={<SupportPage />} />
                <Route path="blockchain" element={<BlockchainEvidencePage />} />
                <Route path="verify-identity" element={<IdentityVerificationPage />} />
                <Route path="artist-profiles" element={<ArtistProfilesPage />} />
                <Route path="media-library" element={<MediaLibraryPage />} />
                <Route path="press" element={<PressPage />} />
                
                <Route path="admin/users" element={<Suspense fallback={null}><AdminGuard><AdminUsersPage /></AdminGuard></Suspense>} />
                <Route path="admin/credits" element={<Suspense fallback={null}><AdminGuard><AdminCreditsPage /></AdminGuard></Suspense>} />
                <Route path="admin/works" element={<Suspense fallback={null}><AdminGuard><AdminWorksPage /></AdminGuard></Suspense>} />
                <Route path="admin/metrics" element={<Suspense fallback={null}><AdminGuard><AdminMetricsPage /></AdminGuard></Suspense>} />
                <Route path="admin/campaigns" element={<Suspense fallback={null}><AdminGuard><AdminCampaignMetricsPage /></AdminGuard></Suspense>} />
                <Route path="admin/system" element={<Suspense fallback={null}><AdminGuard><AdminSystemPage /></AdminGuard></Suspense>} />
                <Route path="admin/premium-promos" element={<Suspense fallback={null}><AdminGuard><AdminPremiumPromosPage /></AdminGuard></Suspense>} />
                <Route path="admin/feature-costs" element={<Suspense fallback={null}><AdminGuard><AdminFeatureCostsPage /></AdminGuard></Suspense>} />
                <Route path="admin/api-costs" element={<Suspense fallback={null}><AdminGuard><AdminApiCostsPage /></AdminGuard></Suspense>} />
                <Route path="admin/product-metrics" element={<Suspense fallback={null}><AdminGuard><AdminProductMetrics /></AdminGuard></Suspense>} />
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
              <Route path="/ai-studio/promo-material" element={<PromoMaterial />} />
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
