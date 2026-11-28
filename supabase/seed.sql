-- =============================================================================
-- DiVA Vision Explorer Quiz - Initial Seed Data (Campaign and test users)
-- =============================================================================

-- 1. Default Active Campaign
INSERT INTO public.campaigns (campaign_code, title, quiz_mode, stage_mix, max_attempts, min_valid_seconds, suggested_minutes, status, show_leaderboard)
VALUES ('VISION2035_V1', N'Khám phá Vision 2035 – Hiểu Vision, vui cùng MMV!', 'Random_Pool_15', '{"LOOK":5,"THINK":6,"CONNECT":4}'::jsonb, 1, 60, 10, 'Active', true)
ON CONFLICT (campaign_code) DO NOTHING;

-- 2. Sample Employees & Roles (Replace/Import full company list via Admin UI)
INSERT INTO public.users_roles (employee_code, full_name, email, department, employee_type, role, verify_pin)
VALUES
  ('MMV0001', N'Quản trị Hệ thống DiVA', 'admin@mmv.local', N'HR & DiVA Team', 'Office', 'admin', NULL),
  ('MMV0002', N'Kiểm duyệt Nội dung', 'reviewer@mmv.local', N'DiVA Team', 'Office', 'reviewer', NULL),
  ('MMV0003', N'Quản lý Nhân sự HR', 'hr@mmv.local', N'Human Resources', 'Management', 'hr_viewer', NULL),
  ('MMV0101', N'Nguyễn Văn An', NULL, N'Sản xuất - Line 1', 'Genba', 'employee', '0101'),
  ('MMV0102', N'Trần Thị Bình', NULL, N'Sản xuất - Line 2', 'Genba', 'employee', NULL),
  ('MMV0201', N'Lê Minh Cường', 'cuong.le@mmv.local', N'Kỹ thuật (Engineering)', 'Office', 'employee', NULL)
ON CONFLICT (employee_code) DO NOTHING;

-- The 15 survey questions are installed by the migrations.
