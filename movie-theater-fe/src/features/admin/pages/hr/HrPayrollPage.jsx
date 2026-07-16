import { useCallback, useEffect, useState } from 'react';
import TabTransition from '../../../../shared/components/TabTransition';
import { AdminPage, PageHeader, FilterPills } from '../../components';
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

      <FilterPills
        value={tab}
        onChange={setTab}
        items={TABS}
        ariaLabel="Tab lương"
        className="mb-4"
      />

      <TabTransition activeKey={tab}>
        {tab === 'periods' && <PayrollPeriodsTab staff={staff} />}
        {tab === 'profiles' && <EmployeeProfilesTab />}
        {tab === 'holidays' && <HolidaysTab />}
      </TabTransition>
    </AdminPage>
  );
};

export default HrPayrollPage;
