-- Seed default mobility exercises
INSERT INTO mobility_exercises (name, body_group, youtube_url, sets, reps, duration_seconds, is_custom) VALUES
  ('Cat-Cow Stretch', 'Back', 'https://youtube.com/watch?v=kqnua4rHVVA', 1, 10, NULL, false),
  ('Thread the Needle', 'Back', 'https://youtube.com/watch?v=SFUqJLjv-t8', 2, 8, NULL, false),
  ('Child''s Pose', 'Back', 'https://youtube.com/watch?v=eqVMAPM00DM', 1, NULL, 60, false),
  ('Hip Flexor Stretch', 'Hips', 'https://youtube.com/watch?v=UWIYsL5ewug', 2, NULL, 30, false),
  ('Pigeon Pose', 'Hips', 'https://youtube.com/watch?v=s8JcNwI8RNg', 1, NULL, 60, false),
  ('90/90 Hip Stretch', 'Hips', 'https://youtube.com/watch?v=wiFNA3sqjCA', 2, NULL, 45, false),
  ('Shoulder Circles', 'Shoulders', NULL, 2, 15, NULL, false),
  ('Wall Angels', 'Shoulders', 'https://youtube.com/watch?v=M_ooIhKYs7c', 2, 12, NULL, false),
  ('Doorway Chest Stretch', 'Shoulders', 'https://youtube.com/watch?v=WLSwU6pAKRA', 2, NULL, 30, false),
  ('Ankle Rotations', 'Ankles', NULL, 2, 10, NULL, false),
  ('Calf Raises', 'Ankles', NULL, 3, 15, NULL, false),
  ('Ankle Alphabet', 'Ankles', NULL, 1, 26, NULL, false),
  ('Knee Circles', 'Knees', NULL, 2, 10, NULL, false),
  ('Quad Stretch', 'Knees', 'https://youtube.com/watch?v=XsizPLtqMwY', 2, NULL, 30, false),
  ('World''s Greatest Stretch', 'Full Body', 'https://youtube.com/watch?v=MxfL6MereZI', 2, 5, NULL, false),
  ('Sun Salutation', 'Full Body', 'https://youtube.com/watch?v=73sjOu0g58M', 1, 5, NULL, false),
  ('Foam Rolling - Full Body', 'Full Body', 'https://youtube.com/watch?v=aeJaB2Qe8Pk', 1, NULL, 300, false)
ON CONFLICT DO NOTHING;
