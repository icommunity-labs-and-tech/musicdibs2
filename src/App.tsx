import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import { ChatWidget } from "./components/ChatWidget";
import { SocialProofPopup } from "./components/SocialProofPopup";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Contact from "./pages/Contact";
import SLA from "./pages/SLA";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Cookies from "./pages/Cookies";
import FAQ from "./pages/FAQ";
import LegalValidity from "./pages/LegalValidity";
import Partners from "./pages/Partners";
import Verify from "./pages/Verify";
import Distribution from "./pages/Distribution";
import Marketing from "./pages/Marketing";
import News from "./pages/News";
import NewsArticle from "./pages/NewsArticle";
import AdminLogin from "./pages/AdminLogin";
import AdminBlog from "./pages/AdminBlog";
import AdminABTests from "./pages/AdminABTests";
import UserLogin from "./pages/UserLogin";
import ResetPassword from "./pages/ResetPassword";
import DashboardLayout from "./pages/DashboardLayout";
import DashboardHome from "./pages/DashboardHome";
import RegisterPage from "./pages/RegisterPage";
import VerifyPage from "./pages/VerifyPage";
import PromotePage from "./pages/PromotePage";
import CreditsPage from "./pages/CreditsPage";
import ProfilePage from "./pages/ProfilePage";
import BillingPage from "./pages/BillingPage";
import SupportPage from "./pages/SupportPage";
import BlockchainEvidencePage from "./pages/BlockchainEvidencePage";
import IdentityVerificationPage from "./pages/IdentityVerificationPage";
import LaunchPage from "./pages/LaunchPage";
import AIStudio from "./pages/AIStudio";
import AIStudioCreate from "./pages/AIStudioCreate";
import AIStudioEdit from "./pages/AIStudioEdit";
import AIStudioInspire from "./pages/AIStudioInspire";
import AIStudioVideo from "./pages/AIStudioVideo";
import AIStudioCovers from "./pages/AIStudioCovers";
import { AdminGuard } from "./components/AdminGuard";
import { ManagerGuard } from "./components/ManagerGuard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminCreditsPage from "./pages/AdminCreditsPage";
import AdminWorksPage from "./pages/AdminWorksPage";
import AdminMetricsPage from "./pages/AdminMetricsPage";
import AdminSystemPage from "./pages/AdminSystemPage";
import ManagerDashboard from "./pages/ManagerDashboard";
import ManagerArtists from "./pages/ManagerArtists";
import ManagerArtistNew from "./pages/ManagerArtistNew";
import ManagerArtistDetail from "./pages/ManagerArtistDetail";
import ManagerWorks from "./pages/ManagerWorks";
import ManagerRegisterWork from "./pages/ManagerRegisterWork";
import ManagerLanding from "./pages/ManagerLanding";
import ArtistProfilesPage from "./pages/ArtistProfilesPage";
import VoiceCloningPage from "./pages/VoiceCloningPage";
import NotFound from "./pages/NotFound";

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
              <Route path="admin/users" element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
              <Route path="admin/credits" element={<AdminGuard><AdminCreditsPage /></AdminGuard>} />
              <Route path="admin/works" element={<AdminGuard><AdminWorksPage /></AdminGuard>} />
              <Route path="admin/metrics" element={<AdminGuard><AdminMetricsPage /></AdminGuard>} />
              <Route path="admin/system" element={<AdminGuard><AdminSystemPage /></AdminGuard>} />
              <Route path="manager" element={<ManagerGuard><ManagerDashboard /></ManagerGuard>} />
              <Route path="manager/artists" element={<ManagerGuard><ManagerArtists /></ManagerGuard>} />
              <Route path="manager/artists/new" element={<ManagerGuard><ManagerArtistNew /></ManagerGuard>} />
              <Route path="manager/artists/:artistId" element={<ManagerGuard><ManagerArtistDetail /></ManagerGuard>} />
              <Route path="manager/works" element={<ManagerGuard><ManagerWorks /></ManagerGuard>} />
              <Route path="manager/register" element={<ManagerGuard><ManagerRegisterWork /></ManagerGuard>} />
            </Route>
            <Route path="/ai-studio" element={<AIStudio />} />
            <Route path="/ai-studio/create" element={<AIStudioCreate />} />
            <Route path="/ai-studio/edit" element={<AIStudioEdit />} />
            <Route path="/ai-studio/inspire" element={<AIStudioInspire />} />
            <Route path="/ai-studio/video" element={<AIStudioVideo />} />
            <Route path="/ai-studio/covers" element={<AIStudioCovers />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
