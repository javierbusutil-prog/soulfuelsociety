import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import Community from "./pages/Community";
import Calendar from "./pages/Calendar";
import Workouts from "./pages/Workouts";
import Coach from "./pages/Coach";
import Store from "./pages/Store";
import Upgrade from "./pages/Upgrade";
import Profile from "./pages/Profile";

import Nutrition from "./pages/Nutrition";
import TrainWithUs from "./pages/TrainWithUs";
import Onboarding from "./pages/Onboarding";
import Invite from "./pages/Invite";
import JoinGroup from "./pages/JoinGroup";
import Waiver from "./pages/Waiver";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminMembers from "./pages/admin/AdminMembers";
import AdminMemberDetail from "./pages/admin/AdminMemberDetail";
import AdminProgramBuilder from "./pages/admin/AdminProgramBuilder";
import AdminPrograms from "./pages/admin/AdminPrograms";
import AdminMessages from "./pages/admin/AdminMessages";
import AdminSessions from "./pages/admin/AdminSessions";
import AdminAvailability from "./pages/admin/AdminAvailability";
import AdminRevenue from "./pages/admin/AdminRevenue";

// Booking pages
import BookSession from "./pages/BookSession";
import BookConfirm from "./pages/BookConfirm";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (profile && !profile.waiver_accepted) {
    return <Navigate to="/waiver" replace />;
  }
  
  return <>{children}</>;
}

function CoachRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isPTAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin && !isPTAdmin) {
    return <Navigate to="/community" replace />;
  }
  
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, isPTAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    // Coaches go to admin, members go to community
    if (isAdmin || isPTAdmin) {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/community" replace />;
  }
  
  return <>{children}</>;
}

function WaiverRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Waiver />;
}

function SmartRedirect() {
  const { user, isAdmin, isPTAdmin, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (isAdmin || isPTAdmin) return <Navigate to="/admin" replace />;
  return <Navigate to="/community" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<SmartRedirect />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      
      {/* Protected member routes */}
      <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
      <Route path="/train" element={<ProtectedRoute><TrainWithUs /></ProtectedRoute>} />
      <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
      <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
      <Route path="/workouts" element={<ProtectedRoute><Workouts /></ProtectedRoute>} />
      <Route path="/coach" element={<ProtectedRoute><Coach /></ProtectedRoute>} />
      <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />
      <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
      <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
      <Route path="/invite" element={<ProtectedRoute><Invite /></ProtectedRoute>} />
      <Route path="/join/:token" element={<JoinGroup />} />
      <Route path="/waiver" element={<WaiverRoute />} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/book" element={<ProtectedRoute><BookSession /></ProtectedRoute>} />
      <Route path="/book/confirm/:bookingId" element={<ProtectedRoute><BookConfirm /></ProtectedRoute>} />
      
      {/* Coach admin routes */}
      <Route path="/admin" element={<CoachRoute><AdminDashboard /></CoachRoute>} />
      <Route path="/admin/members" element={<CoachRoute><AdminMembers /></CoachRoute>} />
      <Route path="/admin/members/:id" element={<CoachRoute><AdminMemberDetail /></CoachRoute>} />
      <Route path="/admin/members/:id/program" element={<CoachRoute><AdminProgramBuilder /></CoachRoute>} />
      <Route path="/admin/programs" element={<CoachRoute><AdminPrograms /></CoachRoute>} />
      <Route path="/admin/messages" element={<CoachRoute><AdminMessages /></CoachRoute>} />
      <Route path="/admin/sessions" element={<CoachRoute><AdminSessions /></CoachRoute>} />
      <Route path="/admin/availability" element={<CoachRoute><AdminAvailability /></CoachRoute>} />
      <Route path="/admin/revenue" element={<CoachRoute><AdminRevenue /></CoachRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
