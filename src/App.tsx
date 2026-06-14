import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Square from "@/pages/Square";
import MyAI from "@/pages/MyAI";
import Chat from "@/pages/Chat";
import Relations from "@/pages/Relations";
import ScriptBoard from "@/pages/ScriptBoard";
import Playback from "@/pages/Playback";
import Settings from "@/pages/Settings";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/chat" replace />} />
        <Route element={<SidebarLayout />}>
          <Route path="/square" element={<Square />} />
          <Route path="/my-ai" element={<MyAI />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/relations" element={<Relations />} />
          <Route path="/scripts" element={<ScriptBoard />} />
          <Route path="/playback" element={<Playback />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </Router>
  );
}
