/**
 * Mock data derived from the testing_data CSV files.
 * Replace with real IPC/DB calls when the backend is ready.
 */

// ---------------------------------------------------------------------------
// Master data (from tutor_list.csv / uc_list.csv)
// ---------------------------------------------------------------------------
export interface UnitRecord {
  id: number;
  curriculumType: string;
  code: string;
  title: string;
  status: string;
  coordinator: string;
  coordinatorId: string;
}

export const UNITS: UnitRecord[] = [
  { id: 1, curriculumType: 'Unit', code: 'ACCT1101', title: 'Financial Accounting', status: 'Active', coordinator: 'Leo Langa', coordinatorId: '00070409' },
  { id: 2, curriculumType: 'Unit', code: 'ACCT2112', title: 'Management Accounting', status: 'Active', coordinator: 'Simeng Liu', coordinatorId: '00119676' },
  { id: 3, curriculumType: 'Unit', code: 'ACCT2201', title: 'Corporate Accounting', status: 'Active', coordinator: 'Collette Chesters', coordinatorId: '00079904' },
  { id: 4, curriculumType: 'Unit', code: 'ACCT2242', title: 'Accounting Information Systems', status: 'Active', coordinator: 'Dr Fangbin Lin', coordinatorId: '00119677' },
  { id: 5, curriculumType: 'Unit', code: 'ACCT2331', title: 'Taxation', status: 'Active', coordinator: 'Chao Ding', coordinatorId: '00086841' },
  { id: 6, curriculumType: 'Unit', code: 'ACCT3321', title: 'Financial Accounting: Theory and Practice', status: 'Active', coordinator: 'Alex Zhang', coordinatorId: '00102969' },
  { id: 7, curriculumType: 'Unit', code: 'ACCT3323', title: 'Strategic Management Accounting', status: 'Active', coordinator: 'Stijn Masschelein', coordinatorId: '00076637' },
  { id: 8, curriculumType: 'Unit', code: 'ACCT4471', title: 'Advanced Accounting Research', status: 'Active', coordinator: 'Vincent Chong', coordinatorId: '00044403' },
  { id: 9, curriculumType: 'Unit', code: 'BUSN1103', title: 'Foundations of Global Business', status: 'Active', coordinator: 'Donella Caspersz', coordinatorId: '00032974' },
  { id: 10, curriculumType: 'Unit', code: 'BUSN1104', title: 'Business Communication for Change, Influence and Impact', status: 'Active', coordinator: 'Antony Gray', coordinatorId: '00059616' },
  { id: 11, curriculumType: 'Unit', code: 'ECON1101', title: 'Microeconomics: Prices and Markets', status: 'Active', coordinator: 'Anna Matysiak', coordinatorId: '00082741' },
  { id: 12, curriculumType: 'Unit', code: 'ECON2234', title: 'Macroeconomics', status: 'Active', coordinator: 'Shrawan Kumar', coordinatorId: '00091104' },
  { id: 13, curriculumType: 'Unit', code: 'FINA3320', title: 'Corporate Finance', status: 'Active', coordinator: 'Adrian Lee', coordinatorId: '00073820' },
  { id: 14, curriculumType: 'Unit', code: 'MGMT2240', title: 'Organisational Behaviour', status: 'Active', coordinator: 'Karen Becker', coordinatorId: '00088231' },
  { id: 15, curriculumType: 'Unit', code: 'MGMT3330', title: 'Strategic Management', status: 'Active', coordinator: 'Michael Lubrano', coordinatorId: '00062118' },
  { id: 16, curriculumType: 'Unit', code: 'MKTG2200', title: 'Marketing Principles', status: 'Active', coordinator: 'Felix Septianto', coordinatorId: '00109442' },
  { id: 17, curriculumType: 'Unit', code: 'MKTG3301', title: 'Consumer Behaviour', status: 'Active', coordinator: 'Yuri Seo', coordinatorId: '00110073' },
  { id: 18, curriculumType: 'Unit', code: 'STAT2401', title: 'Analysis of Experiments', status: 'Active', coordinator: 'John Lim', coordinatorId: '00084930' },
  { id: 19, curriculumType: 'Unit', code: 'BUSN5531', title: 'Leadership and Governance', status: 'Inactive', coordinator: 'Marc Hanningan', coordinatorId: '00055671' },
  { id: 20, curriculumType: 'Unit', code: 'FINA5530', title: 'Financial Derivatives', status: 'Active', coordinator: 'Petko Kalev', coordinatorId: '00068342' },
];

// ---------------------------------------------------------------------------
// Tutors (subset derived from tutor_list.csv)
// ---------------------------------------------------------------------------
export interface TutorRecord {
  id: string;
  name: string;
  email: string;
  unitCode: string;
  unitTitle: string;
  role: 'Tutor' | 'Unit Coordinator';
}

export const TUTORS: TutorRecord[] = [
  { id: 'T001', name: 'Leo Langa', email: 'leo.langa@uwa.edu.au', unitCode: 'ACCT1101', unitTitle: 'Financial Accounting', role: 'Unit Coordinator' },
  { id: 'T002', name: 'Simeng Liu', email: 'simeng.liu@uwa.edu.au', unitCode: 'ACCT2112', unitTitle: 'Management Accounting', role: 'Unit Coordinator' },
  { id: 'T003', name: 'Collette Chesters', email: 'collette.chesters@uwa.edu.au', unitCode: 'ACCT2201', unitTitle: 'Corporate Accounting', role: 'Unit Coordinator' },
  { id: 'T004', name: 'Dr Fangbin Lin', email: 'fangbin.lin@uwa.edu.au', unitCode: 'ACCT2242', unitTitle: 'Accounting Information Systems', role: 'Unit Coordinator' },
  { id: 'T005', name: 'Chao Ding', email: 'chao.ding@uwa.edu.au', unitCode: 'ACCT2331', unitTitle: 'Taxation', role: 'Unit Coordinator' },
  { id: 'T006', name: 'Alex Zhang', email: 'alex.zhang@uwa.edu.au', unitCode: 'ACCT3321', unitTitle: 'Financial Accounting: Theory and Practice', role: 'Unit Coordinator' },
  { id: 'T007', name: 'Stijn Masschelein', email: 'stijn.masschelein@uwa.edu.au', unitCode: 'ACCT3323', unitTitle: 'Strategic Management Accounting', role: 'Unit Coordinator' },
  { id: 'T008', name: 'Vincent Chong', email: 'vincent.chong@uwa.edu.au', unitCode: 'ACCT4471', unitTitle: 'Advanced Accounting Research', role: 'Unit Coordinator' },
  { id: 'T009', name: 'Donella Caspersz', email: 'donella.caspersz@uwa.edu.au', unitCode: 'BUSN1103', unitTitle: 'Foundations of Global Business', role: 'Unit Coordinator' },
  { id: 'T010', name: 'Antony Gray', email: 'antony.gray@uwa.edu.au', unitCode: 'BUSN1104', unitTitle: 'Business Communication', role: 'Unit Coordinator' },
  { id: 'T011', name: 'Anna Matysiak', email: 'anna.matysiak@uwa.edu.au', unitCode: 'ECON1101', unitTitle: 'Microeconomics', role: 'Unit Coordinator' },
  { id: 'T012', name: 'Adrian Lee', email: 'adrian.lee@uwa.edu.au', unitCode: 'FINA3320', unitTitle: 'Corporate Finance', role: 'Unit Coordinator' },
  { id: 'T013', name: 'Karen Becker', email: 'karen.becker@uwa.edu.au', unitCode: 'MGMT2240', unitTitle: 'Organisational Behaviour', role: 'Unit Coordinator' },
  { id: 'T014', name: 'Felix Septianto', email: 'felix.septianto@uwa.edu.au', unitCode: 'MKTG2200', unitTitle: 'Marketing Principles', role: 'Unit Coordinator' },
  { id: 'T015', name: 'Yuri Seo', email: 'yuri.seo@uwa.edu.au', unitCode: 'MKTG3301', unitTitle: 'Consumer Behaviour', role: 'Unit Coordinator' },
  { id: 'T016', name: 'Michael Walsh', email: 'michael.walsh@uwa.edu.au', unitCode: 'ACCT1101', unitTitle: 'Financial Accounting', role: 'Tutor' },
  { id: 'T017', name: 'Sarah Johnson', email: 'sarah.johnson@uwa.edu.au', unitCode: 'ECON1101', unitTitle: 'Microeconomics', role: 'Tutor' },
  { id: 'T018', name: 'James Liu', email: 'james.liu@uwa.edu.au', unitCode: 'MGMT2240', unitTitle: 'Organisational Behaviour', role: 'Tutor' },
  { id: 'T019', name: 'Emily Chen', email: 'emily.chen@uwa.edu.au', unitCode: 'MKTG2200', unitTitle: 'Marketing Principles', role: 'Tutor' },
  { id: 'T020', name: 'David Kim', email: 'david.kim@uwa.edu.au', unitCode: 'FINA3320', unitTitle: 'Corporate Finance', role: 'Tutor' },
];

// ---------------------------------------------------------------------------
// Nominations
// ---------------------------------------------------------------------------
export type NominationStatus = 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn';

export interface Nomination {
  id: string;
  nominatorName: string;
  nominatorEmail: string;
  nomineeId: string;
  nomineeName: string;
  nomineeEmail: string;
  unitCode: string;
  unitTitle: string;
  reason: string;
  status: NominationStatus;
  submittedAt: string;
  periodId: string;
}

export const NOMINATIONS: Nomination[] = [
  { id: 'N001', nominatorName: 'Alice Brown', nominatorEmail: 'alice.brown@student.uwa.edu.au', nomineeId: 'T001', nomineeName: 'Leo Langa', nomineeEmail: 'leo.langa@uwa.edu.au', unitCode: 'ACCT1101', unitTitle: 'Financial Accounting', reason: 'Exceptional clarity in explaining complex accounting concepts.', status: 'Approved', submittedAt: '2026-03-01', periodId: 'P2026S1' },
  { id: 'N002', nominatorName: 'Bob Green', nominatorEmail: 'bob.green@student.uwa.edu.au', nomineeId: 'T002', nomineeName: 'Simeng Liu', nomineeEmail: 'simeng.liu@uwa.edu.au', unitCode: 'ACCT2112', unitTitle: 'Management Accounting', reason: 'Always available for consultation and provides great feedback.', status: 'Approved', submittedAt: '2026-03-02', periodId: 'P2026S1' },
  { id: 'N003', nominatorName: 'Carol White', nominatorEmail: 'carol.white@student.uwa.edu.au', nomineeId: 'T003', nomineeName: 'Collette Chesters', nomineeEmail: 'collette.chesters@uwa.edu.au', unitCode: 'ACCT2201', unitTitle: 'Corporate Accounting', reason: 'Makes accounting fun and engaging.', status: 'Pending', submittedAt: '2026-03-05', periodId: 'P2026S1' },
  { id: 'N004', nominatorName: 'Dan Lee', nominatorEmail: 'dan.lee@student.uwa.edu.au', nomineeId: 'T009', nomineeName: 'Donella Caspersz', nomineeEmail: 'donella.caspersz@uwa.edu.au', unitCode: 'BUSN1103', unitTitle: 'Foundations of Global Business', reason: 'Inspired me to pursue a career in international business.', status: 'Approved', submittedAt: '2026-03-06', periodId: 'P2026S1' },
  { id: 'N005', nominatorName: 'Eve Taylor', nominatorEmail: 'eve.taylor@student.uwa.edu.au', nomineeId: 'T010', nomineeName: 'Antony Gray', nomineeEmail: 'antony.gray@uwa.edu.au', unitCode: 'BUSN1104', unitTitle: 'Business Communication', reason: 'Transformed my communication skills significantly.', status: 'Pending', submittedAt: '2026-03-07', periodId: 'P2026S1' },
  { id: 'N006', nominatorName: 'Frank Wilson', nominatorEmail: 'frank.wilson@student.uwa.edu.au', nomineeId: 'T011', nomineeName: 'Anna Matysiak', nomineeEmail: 'anna.matysiak@uwa.edu.au', unitCode: 'ECON1101', unitTitle: 'Microeconomics', reason: 'Brilliant lecturer — every class feels like a revelation.', status: 'Approved', submittedAt: '2026-03-08', periodId: 'P2026S1' },
  { id: 'N007', nominatorName: 'Grace Hall', nominatorEmail: 'grace.hall@student.uwa.edu.au', nomineeId: 'T012', nomineeName: 'Adrian Lee', nomineeEmail: 'adrian.lee@uwa.edu.au', unitCode: 'FINA3320', unitTitle: 'Corporate Finance', reason: 'Uses real-world examples to make finance approachable.', status: 'Rejected', submittedAt: '2026-03-09', periodId: 'P2026S1' },
  { id: 'N008', nominatorName: 'Henry Adams', nominatorEmail: 'henry.adams@student.uwa.edu.au', nomineeId: 'T013', nomineeName: 'Karen Becker', nomineeEmail: 'karen.becker@uwa.edu.au', unitCode: 'MGMT2240', unitTitle: 'Organisational Behaviour', reason: 'Deeply passionate and makes every student feel valued.', status: 'Approved', submittedAt: '2026-03-10', periodId: 'P2026S1' },
  { id: 'N009', nominatorName: 'Iris Martinez', nominatorEmail: 'iris.martinez@student.uwa.edu.au', nomineeId: 'T014', nomineeName: 'Felix Septianto', nomineeEmail: 'felix.septianto@uwa.edu.au', unitCode: 'MKTG2200', unitTitle: 'Marketing Principles', reason: 'Innovative teaching methods that keep students engaged.', status: 'Pending', submittedAt: '2026-03-11', periodId: 'P2026S1' },
  { id: 'N010', nominatorName: 'Jack Thompson', nominatorEmail: 'jack.thompson@student.uwa.edu.au', nomineeId: 'T015', nomineeName: 'Yuri Seo', nomineeEmail: 'yuri.seo@uwa.edu.au', unitCode: 'MKTG3301', unitTitle: 'Consumer Behaviour', reason: 'Passionate about the subject and encourages critical thinking.', status: 'Approved', submittedAt: '2026-03-12', periodId: 'P2026S1' },
  { id: 'N011', nominatorName: 'Kate Evans', nominatorEmail: 'kate.evans@student.uwa.edu.au', nomineeId: 'T016', nomineeName: 'Michael Walsh', nomineeEmail: 'michael.walsh@uwa.edu.au', unitCode: 'ACCT1101', unitTitle: 'Financial Accounting', reason: 'Most helpful tutor I have had at UWA.', status: 'Pending', submittedAt: '2026-03-13', periodId: 'P2026S1' },
  { id: 'N012', nominatorName: 'Liam Parker', nominatorEmail: 'liam.parker@student.uwa.edu.au', nomineeId: 'T017', nomineeName: 'Sarah Johnson', nomineeEmail: 'sarah.johnson@uwa.edu.au', unitCode: 'ECON1101', unitTitle: 'Microeconomics', reason: 'Goes above and beyond every tutorial session.', status: 'Approved', submittedAt: '2026-03-14', periodId: 'P2026S1' },
  { id: 'N013', nominatorName: 'Mia Scott', nominatorEmail: 'mia.scott@student.uwa.edu.au', nomineeId: 'T004', nomineeName: 'Dr Fangbin Lin', nomineeEmail: 'fangbin.lin@uwa.edu.au', unitCode: 'ACCT2242', unitTitle: 'Accounting Information Systems', reason: 'Brings AIS to life with hands-on workshops.', status: 'Withdrawn', submittedAt: '2026-03-15', periodId: 'P2026S1' },
  { id: 'N014', nominatorName: 'Noah Davis', nominatorEmail: 'noah.davis@student.uwa.edu.au', nomineeId: 'T005', nomineeName: 'Chao Ding', nomineeEmail: 'chao.ding@uwa.edu.au', unitCode: 'ACCT2331', unitTitle: 'Taxation', reason: 'Makes tax law surprisingly interesting.', status: 'Pending', submittedAt: '2026-03-16', periodId: 'P2026S1' },
  { id: 'N015', nominatorName: 'Olivia Clark', nominatorEmail: 'olivia.clark@student.uwa.edu.au', nomineeId: 'T006', nomineeName: 'Alex Zhang', nomineeEmail: 'alex.zhang@uwa.edu.au', unitCode: 'ACCT3321', unitTitle: 'Financial Accounting: Theory and Practice', reason: 'Clear, structured, and always patient with questions.', status: 'Approved', submittedAt: '2026-03-17', periodId: 'P2026S1' },
  { id: 'N016', nominatorName: 'Paul Roberts', nominatorEmail: 'paul.roberts@student.uwa.edu.au', nomineeId: 'T007', nomineeName: 'Stijn Masschelein', nomineeEmail: 'stijn.masschelein@uwa.edu.au', unitCode: 'ACCT3323', unitTitle: 'Strategic Management Accounting', reason: 'Challenging but incredibly rewarding lecturer.', status: 'Pending', submittedAt: '2026-03-18', periodId: 'P2026S1' },
  { id: 'N017', nominatorName: 'Quinn Wilson', nominatorEmail: 'quinn.wilson@student.uwa.edu.au', nomineeId: 'T018', nomineeName: 'James Liu', nomineeEmail: 'james.liu@uwa.edu.au', unitCode: 'MGMT2240', unitTitle: 'Organisational Behaviour', reason: 'Outstanding tutor who explains concepts clearly.', status: 'Approved', submittedAt: '2026-03-19', periodId: 'P2026S1' },
  { id: 'N018', nominatorName: 'Rachel Moore', nominatorEmail: 'rachel.moore@student.uwa.edu.au', nomineeId: 'T019', nomineeName: 'Emily Chen', nomineeEmail: 'emily.chen@uwa.edu.au', unitCode: 'MKTG2200', unitTitle: 'Marketing Principles', reason: 'Creative and highly engaging tutorial activities.', status: 'Pending', submittedAt: '2026-03-20', periodId: 'P2026S1' },
  { id: 'N019', nominatorName: 'Sam Turner', nominatorEmail: 'sam.turner@student.uwa.edu.au', nomineeId: 'T020', nomineeName: 'David Kim', nomineeEmail: 'david.kim@uwa.edu.au', unitCode: 'FINA3320', unitTitle: 'Corporate Finance', reason: 'Provides real-world insights from his industry experience.', status: 'Approved', submittedAt: '2026-03-21', periodId: 'P2026S1' },
  { id: 'N020', nominatorName: 'Tina Lewis', nominatorEmail: 'tina.lewis@student.uwa.edu.au', nomineeId: 'T008', nomineeName: 'Vincent Chong', nomineeEmail: 'vincent.chong@uwa.edu.au', unitCode: 'ACCT4471', unitTitle: 'Advanced Accounting Research', reason: 'A true mentor who cares about student outcomes.', status: 'Pending', submittedAt: '2026-03-22', periodId: 'P2026S1' },
];

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------
export type ApplicationStatus = 'Not Invited' | 'Invited' | 'Submitted' | 'Under Review' | 'Accepted' | 'Declined';

export interface Application {
  id: string;
  nominationId: string;
  nomineeName: string;
  nomineeEmail: string;
  unitCode: string;
  unitTitle: string;
  status: ApplicationStatus;
  submittedAt: string | null;
  invitedAt: string | null;
  documents: string[];
  periodId: string;
}

export const APPLICATIONS: Application[] = [
  { id: 'AP001', nominationId: 'N001', nomineeName: 'Leo Langa', nomineeEmail: 'leo.langa@uwa.edu.au', unitCode: 'ACCT1101', unitTitle: 'Financial Accounting', status: 'Accepted', submittedAt: '2026-03-20', invitedAt: '2026-03-10', documents: ['statement.pdf', 'cv.pdf'], periodId: 'P2026S1' },
  { id: 'AP002', nominationId: 'N002', nomineeName: 'Simeng Liu', nomineeEmail: 'simeng.liu@uwa.edu.au', unitCode: 'ACCT2112', unitTitle: 'Management Accounting', status: 'Submitted', submittedAt: '2026-03-22', invitedAt: '2026-03-10', documents: ['statement.pdf'], periodId: 'P2026S1' },
  { id: 'AP003', nominationId: 'N004', nomineeName: 'Donella Caspersz', nomineeEmail: 'donella.caspersz@uwa.edu.au', unitCode: 'BUSN1103', unitTitle: 'Foundations of Global Business', status: 'Under Review', submittedAt: '2026-03-25', invitedAt: '2026-03-12', documents: ['statement.pdf', 'evidence.pdf', 'cv.pdf'], periodId: 'P2026S1' },
  { id: 'AP004', nominationId: 'N006', nomineeName: 'Anna Matysiak', nomineeEmail: 'anna.matysiak@uwa.edu.au', unitCode: 'ECON1101', unitTitle: 'Microeconomics', status: 'Invited', submittedAt: null, invitedAt: '2026-03-14', documents: [], periodId: 'P2026S1' },
  { id: 'AP005', nominationId: 'N008', nomineeName: 'Karen Becker', nomineeEmail: 'karen.becker@uwa.edu.au', unitCode: 'MGMT2240', unitTitle: 'Organisational Behaviour', status: 'Submitted', submittedAt: '2026-03-28', invitedAt: '2026-03-15', documents: ['statement.pdf', 'teaching_philosophy.pdf'], periodId: 'P2026S1' },
  { id: 'AP006', nominationId: 'N010', nomineeName: 'Yuri Seo', nomineeEmail: 'yuri.seo@uwa.edu.au', unitCode: 'MKTG3301', unitTitle: 'Consumer Behaviour', status: 'Accepted', submittedAt: '2026-03-18', invitedAt: '2026-03-10', documents: ['statement.pdf', 'cv.pdf'], periodId: 'P2026S1' },
  { id: 'AP007', nominationId: 'N012', nomineeName: 'Sarah Johnson', nomineeEmail: 'sarah.johnson@uwa.edu.au', unitCode: 'ECON1101', unitTitle: 'Microeconomics', status: 'Under Review', submittedAt: '2026-03-29', invitedAt: '2026-03-16', documents: ['statement.pdf'], periodId: 'P2026S1' },
  { id: 'AP008', nominationId: 'N015', nomineeName: 'Alex Zhang', nomineeEmail: 'alex.zhang@uwa.edu.au', unitCode: 'ACCT3321', unitTitle: 'Financial Accounting: Theory and Practice', status: 'Invited', submittedAt: null, invitedAt: '2026-03-18', documents: [], periodId: 'P2026S1' },
  { id: 'AP009', nominationId: 'N017', nomineeName: 'James Liu', nomineeEmail: 'james.liu@uwa.edu.au', unitCode: 'MGMT2240', unitTitle: 'Organisational Behaviour', status: 'Submitted', submittedAt: '2026-04-01', invitedAt: '2026-03-20', documents: ['statement.pdf', 'student_feedback.pdf'], periodId: 'P2026S1' },
  { id: 'AP010', nominationId: 'N019', nomineeName: 'David Kim', nomineeEmail: 'david.kim@uwa.edu.au', unitCode: 'FINA3320', unitTitle: 'Corporate Finance', status: 'Declined', submittedAt: null, invitedAt: '2026-03-22', documents: [], periodId: 'P2026S1' },
];

// ---------------------------------------------------------------------------
// Award periods
// ---------------------------------------------------------------------------
export type PeriodStatus = 'Nominations Open' | 'Applications Open' | 'Closed' | 'Upcoming';

export interface AwardPeriod {
  id: string;
  name: string;
  nominationStart: string;
  nominationEnd: string;
  applicationStart: string;
  applicationEnd: string;
  status: PeriodStatus;
}

export const PERIODS: AwardPeriod[] = [
  {
    id: 'P2026S1',
    name: '2026 Semester 1',
    nominationStart: '2026-03-01',
    nominationEnd: '2026-03-31',
    applicationStart: '2026-04-01',
    applicationEnd: '2026-04-30',
    status: 'Applications Open',
  },
  {
    id: 'P2025S2',
    name: '2025 Semester 2',
    nominationStart: '2025-08-01',
    nominationEnd: '2025-08-31',
    applicationStart: '2025-09-01',
    applicationEnd: '2025-09-30',
    status: 'Closed',
  },
];

// ---------------------------------------------------------------------------
// Notification history
// ---------------------------------------------------------------------------
export type NotificationType = 'Nomination Confirmation' | 'Application Invitation' | 'Reminder' | 'Result';

export interface NotificationRecord {
  id: string;
  type: NotificationType;
  recipientName: string;
  recipientEmail: string;
  sentAt: string;
  status: 'Sent' | 'Failed' | 'Pending';
  periodId: string;
}

export const NOTIFICATIONS: NotificationRecord[] = [
  { id: 'NTF001', type: 'Application Invitation', recipientName: 'Leo Langa', recipientEmail: 'leo.langa@uwa.edu.au', sentAt: '2026-03-10 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF002', type: 'Application Invitation', recipientName: 'Simeng Liu', recipientEmail: 'simeng.liu@uwa.edu.au', sentAt: '2026-03-10 09:01', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF003', type: 'Application Invitation', recipientName: 'Donella Caspersz', recipientEmail: 'donella.caspersz@uwa.edu.au', sentAt: '2026-03-12 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF004', type: 'Application Invitation', recipientName: 'Anna Matysiak', recipientEmail: 'anna.matysiak@uwa.edu.au', sentAt: '2026-03-14 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF005', type: 'Reminder', recipientName: 'Anna Matysiak', recipientEmail: 'anna.matysiak@uwa.edu.au', sentAt: '2026-03-25 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF006', type: 'Application Invitation', recipientName: 'Karen Becker', recipientEmail: 'karen.becker@uwa.edu.au', sentAt: '2026-03-15 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF007', type: 'Application Invitation', recipientName: 'Yuri Seo', recipientEmail: 'yuri.seo@uwa.edu.au', sentAt: '2026-03-10 09:02', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF008', type: 'Application Invitation', recipientName: 'Sarah Johnson', recipientEmail: 'sarah.johnson@uwa.edu.au', sentAt: '2026-03-16 09:00', status: 'Failed', periodId: 'P2026S1' },
  { id: 'NTF009', type: 'Application Invitation', recipientName: 'Alex Zhang', recipientEmail: 'alex.zhang@uwa.edu.au', sentAt: '2026-03-18 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF010', type: 'Reminder', recipientName: 'Alex Zhang', recipientEmail: 'alex.zhang@uwa.edu.au', sentAt: '2026-04-10 09:00', status: 'Pending', periodId: 'P2026S1' },
  { id: 'NTF011', type: 'Application Invitation', recipientName: 'James Liu', recipientEmail: 'james.liu@uwa.edu.au', sentAt: '2026-03-20 09:00', status: 'Sent', periodId: 'P2026S1' },
  { id: 'NTF012', type: 'Application Invitation', recipientName: 'David Kim', recipientEmail: 'david.kim@uwa.edu.au', sentAt: '2026-03-22 09:00', status: 'Sent', periodId: 'P2026S1' },
];

// ---------------------------------------------------------------------------
// Master data upload history
// ---------------------------------------------------------------------------
export type UploadStatus = 'Success' | 'Failed' | 'Partial';

export interface MasterDataUpload {
  id: string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  recordCount: number;
  status: UploadStatus;
  errors: string[];
  type: 'Tutor List' | 'UC List';
}

export const MASTER_DATA_UPLOADS: MasterDataUpload[] = [
  { id: 'UPL001', fileName: 'tutor_list_s1_2026.csv', uploadedAt: '2026-02-28 10:30', uploadedBy: 'Admin', recordCount: 117, status: 'Success', errors: [], type: 'Tutor List' },
  { id: 'UPL002', fileName: 'uc_list_s1_2026.csv', uploadedAt: '2026-02-28 10:35', uploadedBy: 'Admin', recordCount: 117, status: 'Success', errors: [], type: 'UC List' },
  { id: 'UPL003', fileName: 'tutor_list_s2_2025.csv', uploadedAt: '2025-07-25 14:00', uploadedBy: 'Admin', recordCount: 115, status: 'Partial', errors: ['Row 42: Missing coordinator ID', 'Row 89: Duplicate unit code'], type: 'Tutor List' },
  { id: 'UPL004', fileName: 'uc_list_s2_2025.csv', uploadedAt: '2025-07-25 14:10', uploadedBy: 'Admin', recordCount: 115, status: 'Success', errors: [], type: 'UC List' },
];

// ---------------------------------------------------------------------------
// Dashboard computed stats
// ---------------------------------------------------------------------------
export const getDashboardStats = () => {
  const currentPeriod = PERIODS.find(p => p.status !== 'Closed') ?? PERIODS[0];
  const currentNominations = NOMINATIONS.filter(n => n.periodId === currentPeriod.id);
  const totalNominations = NOMINATIONS.length;
  const nominees = new Set(NOMINATIONS.filter(n => n.periodId === currentPeriod.id).map(n => n.nomineeId));
  const submittedApps = APPLICATIONS.filter(a => a.periodId === currentPeriod.id && ['Submitted', 'Under Review', 'Accepted'].includes(a.status));
  const pendingApps = APPLICATIONS.filter(a => a.periodId === currentPeriod.id && ['Invited'].includes(a.status));
  const pendingNominations = NOMINATIONS.filter(n => n.status === 'Pending');
  const failedNotifications = NOTIFICATIONS.filter(n => n.status === 'Failed');

  return {
    currentPeriod,
    totalNominations,
    currentPeriodNominations: currentNominations.length,
    nomineeCount: nominees.size,
    submittedApplications: submittedApps.length,
    pendingApplications: pendingApps.length,
    pendingNominationsToReview: pendingNominations.length,
    failedNotifications: failedNotifications.length,
  };
};
