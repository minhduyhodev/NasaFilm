import fs from 'fs';
import { execSync } from 'child_process';

const original = execSync(
  'git show HEAD:movie-theater-fe/src/features/admin/layouts/AdminLayout.jsx',
  { cwd: 'd:/FPT_SUM2026/moive-theater', encoding: 'utf8' },
);

const sidebarStart = original.indexOf('const Sidebar =');
const sidebarEnd = original.indexOf('const AdminLayout =');
let sidebarBody = original.slice(sidebarStart, sidebarEnd).trim();
sidebarBody = sidebarBody.replace(/^const Sidebar =/, 'const AdminSidebar =');

const header = `import React, { useCallback, useEffect, useState } from 'react';
import { NavLink, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Calendar,
  Tv,
  Ticket,
  Tag,
  Users,
  LogOut,
  Menu,
  Popcorn,
  ChevronDown,
  ChevronRight,
  Sliders,
  Shield,
  Mail,
  TrendingUp,
  UserCheck,
  DollarSign,
  Megaphone,
} from 'lucide-react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { bookingService } from '../../../shared/services/bookingService';
import { useRealtimeTopic } from '../../../shared/hooks/useRealtimeTopic';
import { REALTIME_TOPICS } from '../../../shared/constants/realtimeTopics';
import huyAdmin from '../../../shared/assets/huyadmin.jpg';
import nasaLogo from '../../../shared/assets/NASAFILM.jpg';
import { normalizeAvatarUrl } from '../../../shared/utils/avatarUrl';

const getRoleDisplayLabel = (roles = []) => {
  if (roles.includes('admin')) return 'Quản trị viên';
  if (roles.includes('staff')) return 'Nhân viên';
  return 'Thành viên';
};

`;

fs.writeFileSync(
  'src/features/admin/layouts/AdminSidebar.jsx',
  `${header}${sidebarBody}\n\nexport default AdminSidebar;\n`,
);
console.log('AdminSidebar.jsx created');
