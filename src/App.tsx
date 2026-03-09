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
import AIStudio from "./pages/AIStudio";
import AIStudioCreate from "./pages/AIStudioCreate";
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
            <Route path="/login" element={<UserLogin />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardHome />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="verify" element={<VerifyPage />} />
              <Route path="promote" element={<PromotePage />} />
              <Route path="credits" element={<CreditsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="support" element={<SupportPage />} />
            </Route>
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
