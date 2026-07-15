package com.thdpv.movietheater.hr.config;

import javax.sql.DataSource;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Tạo các bảng của phân hệ chấm công / lương (HR) và seed danh mục ca cố định.
 * Theo mẫu {@code FeatureSchemaMigrationConfig}: idempotent với CREATE TABLE IF NOT EXISTS.
 */
@Configuration
public class HrSchemaMigrationConfig {

    private static final Logger log = LoggerFactory.getLogger(HrSchemaMigrationConfig.class);

    @Bean
    HrSchemaMigrator hrSchemaMigrator(DataSource dataSource) {
        HrSchemaMigrator migrator = new HrSchemaMigrator(new JdbcTemplate(dataSource));
        migrator.migrate();
        return migrator;
    }

    static final class HrSchemaMigrator {
        private final JdbcTemplate jdbc;

        HrSchemaMigrator(JdbcTemplate jdbc) {
            this.jdbc = jdbc;
        }

        void migrate() {
            log.info("Applying HR schema (shift definitions, employee profiles, assignments, attendance, holidays, payroll)...");

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_shift_definition (
                        uuid uuid PRIMARY KEY,
                        code varchar(32) NOT NULL,
                        name varchar(64) NOT NULL,
                        start_time time NOT NULL,
                        end_time time NOT NULL,
                        standard_hours numeric(5,2) NOT NULL DEFAULT 0,
                        active boolean NOT NULL DEFAULT true,
                        sort_order integer NOT NULL DEFAULT 0,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_hr_shift_definition_code UNIQUE (code)
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_employee_profile (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        hourly_rate numeric(15,2) NOT NULL DEFAULT 0,
                        ot_multiplier_weekday numeric(5,2) NOT NULL DEFAULT 1.50,
                        ot_multiplier_weekend numeric(5,2) NOT NULL DEFAULT 2.00,
                        ot_multiplier_holiday numeric(5,2) NOT NULL DEFAULT 2.00,
                        employment_type varchar(32),
                        active boolean NOT NULL DEFAULT true,
                        note text,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        updated_by uuid,
                        CONSTRAINT uk_hr_employee_profile_user UNIQUE (user_uuid)
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_shift_assignment (
                        uuid uuid PRIMARY KEY,
                        user_uuid uuid NOT NULL,
                        shift_definition_uuid uuid NOT NULL,
                        work_date date NOT NULL,
                        status varchar(24) NOT NULL DEFAULT 'SCHEDULED',
                        note text,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        created_by uuid,
                        CONSTRAINT uk_hr_shift_assignment UNIQUE (user_uuid, work_date, shift_definition_uuid)
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_shift_assignment_user_date
                    ON hr_shift_assignment (user_uuid, work_date)
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_shift_assignment_date
                    ON hr_shift_assignment (work_date)
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_attendance (
                        uuid uuid PRIMARY KEY,
                        shift_assignment_uuid uuid,
                        user_uuid uuid NOT NULL,
                        shift_definition_uuid uuid NOT NULL,
                        work_date date NOT NULL,
                        check_in_at timestamptz,
                        check_out_at timestamptz,
                        worked_minutes integer NOT NULL DEFAULT 0,
                        regular_minutes integer NOT NULL DEFAULT 0,
                        ot_minutes integer NOT NULL DEFAULT 0,
                        ot_minutes_approved integer NOT NULL DEFAULT 0,
                        late_minutes integer NOT NULL DEFAULT 0,
                        early_leave_minutes integer NOT NULL DEFAULT 0,
                        attendance_status varchar(24) NOT NULL DEFAULT 'IN_PROGRESS',
                        day_type varchar(16) NOT NULL DEFAULT 'WEEKDAY',
                        approval_status varchar(16) NOT NULL DEFAULT 'PENDING',
                        approved_by uuid,
                        approved_at timestamptz,
                        note text,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_hr_attendance_assignment UNIQUE (shift_assignment_uuid)
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_attendance_user_date
                    ON hr_attendance (user_uuid, work_date)
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_attendance_approval
                    ON hr_attendance (approval_status, work_date)
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_holiday (
                        uuid uuid PRIMARY KEY,
                        holiday_date date NOT NULL,
                        name varchar(160) NOT NULL,
                        multiplier_override numeric(5,2),
                        created_at timestamptz NOT NULL DEFAULT now(),
                        created_by uuid,
                        CONSTRAINT uk_hr_holiday_date UNIQUE (holiday_date)
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_payroll_period (
                        uuid uuid PRIMARY KEY,
                        period_year integer NOT NULL,
                        period_month integer NOT NULL,
                        label varchar(32) NOT NULL,
                        start_date date NOT NULL,
                        end_date date NOT NULL,
                        status varchar(16) NOT NULL DEFAULT 'OPEN',
                        created_at timestamptz NOT NULL DEFAULT now(),
                        created_by uuid,
                        generated_at timestamptz,
                        approved_by uuid,
                        approved_at timestamptz,
                        paid_at timestamptz,
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        CONSTRAINT uk_hr_payroll_period_month UNIQUE (period_year, period_month)
                    )
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_payslip (
                        uuid uuid PRIMARY KEY,
                        payroll_period_uuid uuid NOT NULL,
                        user_uuid uuid NOT NULL,
                        regular_minutes integer NOT NULL DEFAULT 0,
                        ot_minutes integer NOT NULL DEFAULT 0,
                        hourly_rate numeric(15,2) NOT NULL DEFAULT 0,
                        regular_pay numeric(15,2) NOT NULL DEFAULT 0,
                        ot_pay numeric(15,2) NOT NULL DEFAULT 0,
                        bonus_total numeric(15,2) NOT NULL DEFAULT 0,
                        deduction_total numeric(15,2) NOT NULL DEFAULT 0,
                        gross_pay numeric(15,2) NOT NULL DEFAULT 0,
                        net_pay numeric(15,2) NOT NULL DEFAULT 0,
                        status varchar(16) NOT NULL DEFAULT 'DRAFT',
                        note text,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        updated_at timestamptz NOT NULL DEFAULT now(),
                        approved_by uuid,
                        approved_at timestamptz,
                        paid_at timestamptz,
                        CONSTRAINT uk_hr_payslip_period_user UNIQUE (payroll_period_uuid, user_uuid)
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_payslip_user ON hr_payslip (user_uuid)
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_payslip_period ON hr_payslip (payroll_period_uuid)
                    """);

            jdbc.execute("""
                    CREATE TABLE IF NOT EXISTS hr_payslip_adjustment (
                        uuid uuid PRIMARY KEY,
                        payroll_period_uuid uuid NOT NULL,
                        user_uuid uuid NOT NULL,
                        adjustment_type varchar(16) NOT NULL,
                        amount numeric(15,2) NOT NULL DEFAULT 0,
                        reason varchar(255) NOT NULL,
                        created_at timestamptz NOT NULL DEFAULT now(),
                        created_by uuid
                    )
                    """);
            jdbc.execute("""
                    CREATE INDEX IF NOT EXISTS idx_hr_adjustment_period_user
                    ON hr_payslip_adjustment (payroll_period_uuid, user_uuid)
                    """);

            seedShiftDefinitions();

            jdbc.execute("COMMENT ON TABLE hr_attendance IS 'Chấm công theo ca: giờ vào/ra, phút thường/OT, trạng thái duyệt'");
            jdbc.execute("COMMENT ON TABLE hr_payslip IS 'Phiếu lương theo kỳ: lương giờ + OT + thưởng - khấu trừ'");
        }

        private void seedShiftDefinitions() {
            insertShift("11111111-0000-4000-a000-000000000001", "MORNING", "Ca Sáng", "08:00", "12:00", 10);
            insertShift("11111111-0000-4000-a000-000000000002", "AFTERNOON", "Ca Chiều", "13:00", "17:00", 20);
            insertShift("11111111-0000-4000-a000-000000000003", "EVENING", "Ca Tối", "18:00", "22:00", 30);
        }

        private void insertShift(String uuid, String code, String name, String start, String end, int sortOrder) {
            jdbc.update("""
                    INSERT INTO hr_shift_definition
                        (uuid, code, name, start_time, end_time, standard_hours, active, sort_order, created_at, updated_at)
                    VALUES (?::uuid, ?, ?, ?::time, ?::time,
                        EXTRACT(EPOCH FROM (?::time - ?::time)) / 3600.0, true, ?, now(), now())
                    ON CONFLICT (code) DO NOTHING
                    """,
                    uuid, code, name, start, end, end, start, sortOrder);
        }
    }
}
