/*****************************************************************************************
 Project        : InsightFlow AI – Business Meeting Intelligence Platform
 File           : sample_data.sql
 Description    : Sample dataset for development, testing and demonstration.
 Author         : Ms. Jagruti Routh
******************************************************************************************/

/*==============================================================================
 USERS
==============================================================================*/

INSERT INTO users
(full_name, email, password_hash, role, department, profile_image)
VALUES
('Jagruti Routh','jagruti.routh@insightflow.ai','hashed_password_001','Project Manager','Product',NULL),

('Keshav Malhotra','keshav.malhotra@insightflow.ai','hashed_password_002','Backend Developer','Engineering',NULL),

('Radhika Sen','radhika.sen@insightflow.ai','hashed_password_003','AI Engineer','AI Research',NULL),

('Meera Sharma','meera.sharma@insightflow.ai','hashed_password_004','Frontend Developer','Engineering',NULL),

('Shreyas Iyer','shreyas.iyer@insightflow.ai','hashed_password_005','Business Analyst','Business',NULL);



/*==============================================================================
 MEETING
==============================================================================*/

INSERT INTO meetings
(
uploaded_by,
title,
description,
meeting_date,
meeting_time,
duration,
file_name,
file_format,
file_size,
audio_file_path,
meeting_status
)

VALUES
(
1,
'Sprint Planning Meeting - Version 1',
'Initial sprint planning meeting for InsightFlow AI development.',
'2026-08-07',
'10:00:00',
75,
'Sprint_Planning_07082026.mp3',
'mp3',
25400000,
'/uploads/Sprint_Planning_07082026.mp3',
'Completed'
);



/*==============================================================================
 MEETING PARTICIPANTS
==============================================================================*/

INSERT INTO meeting_participants
(meeting_id,user_id,attendance_status,joined_at)

VALUES

(1,1,'Present','2026-08-07 10:00:00'),

(1,2,'Present','2026-08-07 10:01:15'),

(1,3,'Present','2026-08-07 10:00:42'),

(1,4,'Present','2026-08-07 10:02:05'),

(1,5,'Present','2026-08-07 10:01:48');



/*==============================================================================
 TRANSCRIPT
==============================================================================*/

INSERT INTO transcripts
(
meeting_id,
transcript_text,
language,
processing_time
)

VALUES
(
1,

'The team discussed the overall development roadmap for InsightFlow AI. The first priority was completing the PostgreSQL database design followed by backend development using FastAPI. The AI pipeline will use OpenAI Whisper for speech-to-text conversion and a Large Language Model for summarization, task extraction, decision detection and risk identification. The frontend dashboard will be developed using React. Responsibilities were assigned to each team member along with estimated completion timelines.',

'English',

15.72
);



/*==============================================================================
 AI GENERATED INSIGHTS
==============================================================================*/

INSERT INTO meeting_insights
(
meeting_id,
summary,
keywords,
sentiment,
meeting_category,
overall_priority,
confidence_score
)

VALUES
(
1,

'The meeting focused on finalizing the database, defining the backend architecture, planning AI integration and assigning implementation responsibilities for Sprint 1.',

'PostgreSQL, FastAPI, Whisper, React, AI, Sprint Planning, Dashboard',

'Positive',

'Sprint Planning',

'High',

96.80
);



/*==============================================================================
 DECISIONS
==============================================================================*/

INSERT INTO decisions
(
meeting_id,
decision_text,
decision_category,
importance_level
)

VALUES

(1,
'PostgreSQL will be used as the primary relational database.',
'Technology',
'High'),

(1,
'FastAPI will be used for backend API development.',
'Architecture',
'High'),

(1,
'OpenAI Whisper will be used for speech-to-text processing.',
'Artificial Intelligence',
'High');



/*==============================================================================
 RISKS
==============================================================================*/

INSERT INTO risks
(
meeting_id,
risk_description,
risk_level,
mitigation_plan,
status
)

VALUES

(
1,
'Delay in AI model integration due to API limitations.',
'Medium',
'Develop and test each AI module independently before integration.',
'Open'
),

(
1,
'Limited availability of real business meeting recordings.',
'Low',
'Use curated sample recordings during development.',
'Monitoring'
);



/*==============================================================================
 TASKS
==============================================================================*/

INSERT INTO tasks
(
meeting_id,
assigned_to,
task_title,
task_description,
priority_level,
deadline,
status
)

VALUES

(
1,
1,
'Complete PostgreSQL Database',
'Finalize schema, constraints and validation.',
'High',
'2026-08-12',
'In Progress'
),

(
1,
2,
'Develop FastAPI Backend',
'Implement authentication and REST APIs.',
'High',
'2026-08-15',
'Pending'
),

(
1,
3,
'Integrate OpenAI Whisper',
'Implement speech-to-text pipeline.',
'High',
'2026-08-18',
'Pending'
),

(
1,
4,
'Develop React Dashboard',
'Create dashboard UI and analytics pages.',
'Medium',
'2026-08-20',
'Pending'
),

(
1,
5,
'Validate Business Requirements',
'Review functionality against project objectives.',
'Medium',
'2026-08-16',
'Pending'
);



/*==============================================================================
 REPORTS
==============================================================================*/

INSERT INTO reports
(
meeting_id,
report_name,
report_type,
report_format,
file_path,
generated_by
)

VALUES
(
1,
'Sprint_Report_V1',
'Meeting Report',
'PDF',
'/reports/Sprint_Report_V1.pdf',
1
);



/*==============================================================================
 AI PROCESSING LOGS
==============================================================================*/

INSERT INTO ai_processing_logs
(
meeting_id,
current_stage,
status,
started_at,
completed_at,
processing_time,
error_message
)

VALUES
(
1,
'Whisper + NLP Processing',
'Completed',
'2026-08-07 10:00:00',
'2026-08-07 10:00:16',
15.72,
NULL
);