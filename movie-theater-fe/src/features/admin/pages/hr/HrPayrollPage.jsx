import React, { useCallback, useEffect, useState } from 'react';
import { AdminPage, PageHeader } from '../../components';
import PayrollPeriodsTab from './PayrollPeriodsTab';
import EmployeeProfilesTab from './EmployeeProfilesTab';
import HolidaysTab from './HolidaysTab';
import { hrService } from '../../api/hrService';
import './hr.css';

const TABS = [
  { id: 'periods', label: 'Kỳ lương & phiếu lương' },
  { id: 'profiles', label: 'Hồ sơ lương' },
  { id: 'holidays', label: 'Ngày lễ' },
];

const HrPayrollPage = () => {
  const [tab, setTab] = useState('periods');
  const [staff, setStaff] = useState([]);

  const loadStaff = useCallback(async () => {
    try {
      const data = await hrService.getStaffDirectory();
      setStaff(Array.isArray(data) ? data : []);
    } catch {
      setStaff([]);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Chấm công & Lương"
        title="Lương, thưởng & OT"
        description="Cấu hình đơn giá theo giờ, quản lý kỳ lương hàng tháng, thưởng/khấu trừ và ngày lễ."
        variant="default"
      />

      <div className="hr-tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`hr-tab${tab === t.id ? ' hr-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'periods' && <PayrollPeriodsTab staff={staff} />}
      {tab === 'profiles' && <EmployeeProfilesTab />}
      {tab === 'holidays' && <HolidaysTab />}
    </AdminPage>
  );
};

export default HrPayrollPage;
