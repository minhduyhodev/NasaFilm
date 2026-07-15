import { authService } from '../../auth/api/authService';

const unwrap = (response) => response.data?.data ?? response.data;

/**
 * Client API cho module Chấm công & Lương (HR).
 * Bao gồm cả endpoint quản trị (admin) và tự phục vụ nhân viên (me).
 */
class HrService {
  // ----- Danh mục dùng chung -----
  async getShiftDefinitions() {
    try {
      const res = await authService.api.get('/api/hr/shift-definitions');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getStaffDirectory() {
    try {
      const res = await authService.api.get('/api/hr/admin/staff-directory');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getShiftPermissionCatalog() {
    try {
      const res = await authService.api.get('/api/hr/admin/staff-directory/permission-catalog');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateShiftConfig(uuid, { permissions, minStaff } = {}) {
    try {
      const res = await authService.api.put(
        `/api/hr/admin/shift-definitions/${uuid}/config`,
        { permissions, minStaff },
      );
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Xếp ca (HR_SHIFT_MANAGE) -----
  async getAssignments({ from, to, userId } = {}) {
    try {
      const res = await authService.api.get('/api/hr/admin/assignments', {
        params: { from, to, userId: userId || undefined },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createAssignment(payload) {
    try {
      const res = await authService.api.post('/api/hr/admin/assignments', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createAssignmentsBulk(payload) {
    try {
      const res = await authService.api.post('/api/hr/admin/assignments/bulk', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async copyWeek(sourceWeekStart, targetWeekStart) {
    try {
      const res = await authService.api.post('/api/hr/admin/assignments/copy-week', {
        sourceWeekStart,
        targetWeekStart,
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteAssignment(uuid) {
    try {
      const res = await authService.api.delete(`/api/hr/admin/assignments/${uuid}`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Chấm công (HR_ATTENDANCE_MANAGE) -----
  async searchAttendance({ from, to, userId, approvalStatus } = {}) {
    try {
      const res = await authService.api.get('/api/hr/admin/attendance', {
        params: {
          from,
          to,
          userId: userId || undefined,
          approvalStatus: approvalStatus || undefined,
        },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async updateAttendance(uuid, payload) {
    try {
      const res = await authService.api.put(`/api/hr/admin/attendance/${uuid}`, payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async approveAttendance(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/admin/attendance/${uuid}/approve`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async rejectAttendance(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/admin/attendance/${uuid}/reject`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async scanAbsent() {
    try {
      const res = await authService.api.post('/api/hr/admin/attendance/scan-absent');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async bulkApproveAttendance(from, to) {
    try {
      const res = await authService.api.post('/api/hr/admin/attendance/bulk-approve', null, {
        params: { from, to },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getCheckpointCode() {
    try {
      const res = await authService.api.get('/api/hr/admin/attendance/checkpoint-code');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Hồ sơ lương nhân viên (HR_PAYROLL_MANAGE) -----
  async getEmployeeProfiles() {
    try {
      const res = await authService.api.get('/api/hr/admin/employee-profiles');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async upsertEmployeeProfile(userId, payload) {
    try {
      const res = await authService.api.put(`/api/hr/admin/employee-profiles/${userId}`, payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Ngày lễ (HR_PAYROLL_MANAGE) -----
  async getHolidays(year) {
    try {
      const res = await authService.api.get('/api/hr/admin/holidays', {
        params: { year: year || undefined },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createHoliday(payload) {
    try {
      const res = await authService.api.post('/api/hr/admin/holidays', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteHoliday(uuid) {
    try {
      const res = await authService.api.delete(`/api/hr/admin/holidays/${uuid}`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Kỳ lương & phiếu lương (HR_PAYROLL_MANAGE) -----
  async getPayrollPeriods() {
    try {
      const res = await authService.api.get('/api/hr/admin/payroll/periods');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createPayrollPeriod(payload) {
    try {
      const res = await authService.api.post('/api/hr/admin/payroll/periods', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deletePayrollPeriod(uuid) {
    try {
      const res = await authService.api.delete(`/api/hr/admin/payroll/periods/${uuid}`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async generatePayroll(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/admin/payroll/periods/${uuid}/generate`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async approvePayroll(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/admin/payroll/periods/${uuid}/approve`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async payPayroll(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/admin/payroll/periods/${uuid}/pay`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getPayslips(periodUuid) {
    try {
      const res = await authService.api.get(`/api/hr/admin/payroll/periods/${periodUuid}/payslips`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getAdjustments(periodId) {
    try {
      const res = await authService.api.get('/api/hr/admin/payroll/adjustments', {
        params: { periodId },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async addAdjustment(payload) {
    try {
      const res = await authService.api.post('/api/hr/admin/payroll/adjustments', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async deleteAdjustment(uuid) {
    try {
      const res = await authService.api.delete(`/api/hr/admin/payroll/adjustments/${uuid}`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Tự phục vụ nhân viên -----
  async getMyOverview() {
    try {
      const res = await authService.api.get('/api/hr/me/overview');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getMyShifts({ from, to } = {}) {
    try {
      const res = await authService.api.get('/api/hr/me/shifts', { params: { from, to } });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getMyAttendance({ from, to } = {}) {
    try {
      const res = await authService.api.get('/api/hr/me/attendance', { params: { from, to } });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async checkIn(shiftAssignmentUuid, verificationCode) {
    try {
      const res = await authService.api.post('/api/hr/me/check-in', {
        shiftAssignmentUuid,
        verificationCode,
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async checkOut(shiftAssignmentUuid, verificationCode) {
    try {
      const res = await authService.api.post('/api/hr/me/check-out', {
        shiftAssignmentUuid,
        verificationCode,
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getMyPayslips() {
    try {
      const res = await authService.api.get('/api/hr/me/payslips');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getMyPayslip(uuid) {
    try {
      const res = await authService.api.get(`/api/hr/me/payslips/${uuid}`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Nghỉ phép (nhân viên) -----
  async getMyLeaveRequests() {
    try {
      const res = await authService.api.get('/api/hr/me/leave-requests');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createLeaveRequest(payload) {
    try {
      const res = await authService.api.post('/api/hr/me/leave-requests', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async cancelLeaveRequest(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/me/leave-requests/${uuid}/cancel`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Đổi ca (nhân viên) -----
  async getMySwapRequests() {
    try {
      const res = await authService.api.get('/api/hr/me/swap-requests');
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getSwapCandidates(from, to) {
    try {
      const res = await authService.api.get('/api/hr/me/swap-candidates', { params: { from, to } });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async createSwapRequest(payload) {
    try {
      const res = await authService.api.post('/api/hr/me/swap-requests', payload);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async cancelSwapRequest(uuid) {
    try {
      const res = await authService.api.post(`/api/hr/me/swap-requests/${uuid}/cancel`);
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  // ----- Duyệt đơn từ (admin / HR_SHIFT_MANAGE) -----
  async getLeaveRequestsAdmin({ status, userId } = {}) {
    try {
      const res = await authService.api.get('/api/hr/admin/requests/leave', {
        params: { status: status || undefined, userId: userId || undefined },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async approveLeaveRequest(uuid, note) {
    try {
      const res = await authService.api.post(`/api/hr/admin/requests/leave/${uuid}/approve`, { note });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async rejectLeaveRequest(uuid, note) {
    try {
      const res = await authService.api.post(`/api/hr/admin/requests/leave/${uuid}/reject`, { note });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async getSwapRequestsAdmin({ status } = {}) {
    try {
      const res = await authService.api.get('/api/hr/admin/requests/swap', {
        params: { status: status || undefined },
      });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async approveSwapRequest(uuid, note) {
    try {
      const res = await authService.api.post(`/api/hr/admin/requests/swap/${uuid}/approve`, { note });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }

  async rejectSwapRequest(uuid, note) {
    try {
      const res = await authService.api.post(`/api/hr/admin/requests/swap/${uuid}/reject`, { note });
      return unwrap(res);
    } catch (error) {
      throw authService.handleError(error);
    }
  }
}

export const hrService = new HrService();
export default hrService;
