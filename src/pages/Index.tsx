// This file is no longer the main entry — see App.tsx routes
// Kept for backwards compatibility
import { Navigate } from "react-router-dom";
const Index = () => <Navigate to="/" replace />;
export default Index;
