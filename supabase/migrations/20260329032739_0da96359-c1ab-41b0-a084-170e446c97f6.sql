
UPDATE profiles SET subscription_status = 'active', selected_plan = 'online' WHERE id = '75d08999-3179-4f59-8262-4375c3cfb395';

INSERT INTO user_roles (user_id, role) VALUES ('75d08999-3179-4f59-8262-4375c3cfb395', 'paid') ON CONFLICT (user_id, role) DO NOTHING;
