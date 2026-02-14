create extension if not exists "pg_net" with schema "extensions";

drop extension if exists "pg_trgm";

drop extension if exists "postgis";

drop trigger if exists "community_member_count_trigger" on "public"."community_members";

drop trigger if exists "on_friend_bot" on "public"."friendships";

drop trigger if exists "trigger_set_gym_codes" on "public"."gyms";

drop policy "Admins can manage languages" on "public"."app_languages";

drop policy "Public read access" on "public"."app_languages";

drop policy "Admins Delete Translations" on "public"."app_translations";

drop policy "Admins Insert Translations" on "public"."app_translations";

drop policy "Admins Update Translations" on "public"."app_translations";

drop policy "Public Read Translations" on "public"."app_translations";

drop policy "Users can submit entries" on "public"."challenge_entries";

drop policy "Users can update own pending entries" on "public"."challenge_entries";

drop policy "Users can view entries" on "public"."challenge_entries";

drop policy "Users can join challenges" on "public"."challenge_participants";

drop policy "Users can update their challenge status" on "public"."challenge_participants";

drop policy "Users can view challenge participants" on "public"."challenge_participants";

drop policy "Staff can view submissions" on "public"."challenge_submissions";

drop policy "Users can view own submissions" on "public"."challenge_submissions";

drop policy "Authenticated users can create communities" on "public"."communities";

drop policy "Communities are viewable by everyone" on "public"."communities";

drop policy "Community creators can update their communities" on "public"."communities";

drop policy "Community members are viewable by everyone" on "public"."community_members";

drop policy "Users can join communities" on "public"."community_members";

drop policy "Users can leave communities" on "public"."community_members";

drop policy "Users can insert participants" on "public"."conversation_participants";

drop policy "Users can update own participant records" on "public"."conversation_participants";

drop policy "Users can view participants" on "public"."conversation_participants";

drop policy "Users can insert conversations" on "public"."conversations";

drop policy "Users can view conversations" on "public"."conversations";

drop policy "Users can manage their own custom exercises" on "public"."custom_exercises";

drop policy "Users can view all custom exercises" on "public"."custom_exercises";

drop policy "Users can manage their own RSVPs" on "public"."event_participants";

drop policy "Users can view event participants" on "public"."event_participants";

drop policy "Public Read Exercises" on "public"."exercises";

drop policy "Users can accept friendship" on "public"."friendships";

drop policy "Users can insert friendships" on "public"."friendships";

drop policy "Users can request friendship" on "public"."friendships";

drop policy "Users can update friendships" on "public"."friendships";

drop policy "Users can view friendships" on "public"."friendships";

drop policy "Users can view their own friendships" on "public"."friendships";

drop policy "Gym Admins can manage challenges" on "public"."gym_challenges";

drop policy "Public read challenges" on "public"."gym_challenges";

drop policy "Gym Admins can manage events" on "public"."gym_events";

drop policy "Public read events" on "public"."gym_events";

drop policy "Admins can create invites for their gym" on "public"."gym_invites";

drop policy "Admins can delete invites for their gym" on "public"."gym_invites";

drop policy "Admins can view invites for their gym" on "public"."gym_invites";

drop policy "Admins can update monitors" on "public"."gym_monitors";

drop policy "Anyone can create monitor" on "public"."gym_monitors";

drop policy "Anyone can read monitor" on "public"."gym_monitors";

drop policy "Gym Admins can manage news" on "public"."gym_news";

drop policy "Public read news" on "public"."gym_news";

drop policy "Gym Admins can manage settings" on "public"."gym_tv_settings";

drop policy "Public read tv settings" on "public"."gym_tv_settings";

drop policy "Creators can delete own gyms" on "public"."gyms";

drop policy "Creators can update own gyms" on "public"."gyms";

drop policy "Gyms are viewable by everyone" on "public"."gyms";

drop policy "Owners Delete Gyms" on "public"."gyms";

drop policy "Owners Update Gyms" on "public"."gyms";

drop policy "Public Read Gyms" on "public"."gyms";

drop policy "Super Admin Full Access Gyms" on "public"."gyms";

drop policy "Users can create gyms" on "public"."gyms";

drop policy "Users can insert messages" on "public"."messages";

drop policy "Users can send messages" on "public"."messages";

drop policy "Users can view messages" on "public"."messages";

drop policy "System can insert notifications" on "public"."notifications";

drop policy "Users can read own notifications" on "public"."notifications";

drop policy "Users can update own notifications" on "public"."notifications";

drop policy "Manage assignments" on "public"."plan_assignments";

drop policy "View assignments" on "public"."plan_assignments";

drop policy "Public profiles are viewable by everyone." on "public"."profiles";

drop policy "Public profiles" on "public"."profiles";

drop policy "Users can insert own profile" on "public"."profiles";

drop policy "Users can insert their own profile." on "public"."profiles";

drop policy "Users can update own profile" on "public"."profiles";

drop policy "Users can update own profile." on "public"."profiles";

drop policy "Users can update their own streaks" on "public"."streaks";

drop policy "Users can view their own streaks" on "public"."streaks";

drop policy "Clients can accept invites" on "public"."trainer_relationships";

drop policy "Clients can view their trainers" on "public"."trainer_relationships";

drop policy "Trainers can invite clients" on "public"."trainer_relationships";

drop policy "Trainers can manage status" on "public"."trainer_relationships";

drop policy "Trainers can view their clients" on "public"."trainer_relationships";

drop policy "Authenticated users can view all user_gyms" on "public"."user_gyms";

drop policy "Users can delete own user_gyms" on "public"."user_gyms";

drop policy "Users can insert own user_gyms" on "public"."user_gyms";

drop policy "Users can manage own gyms" on "public"."user_gyms";

drop policy "Users can update own user_gyms" on "public"."user_gyms";

drop policy "Users can view own gyms" on "public"."user_gyms";

drop policy "user_gyms_policy_v2" on "public"."user_gyms";

drop policy "user_gyms_write_policy" on "public"."user_gyms";

drop policy "Users can like workouts" on "public"."workout_likes";

drop policy "Users can see likes" on "public"."workout_likes";

drop policy "Users can unlike own" on "public"."workout_likes";

drop policy "Users can delete logs for own workouts" on "public"."workout_logs";

drop policy "Users can delete own workout logs" on "public"."workout_logs";

drop policy "Users can insert logs for own workouts" on "public"."workout_logs";

drop policy "Users can manage own logs" on "public"."workout_logs";

drop policy "Users can read own logs" on "public"."workout_logs";

drop policy "Users can update logs for own workouts" on "public"."workout_logs";

drop policy "Users can view logs for visible workouts" on "public"."workout_logs";

drop policy "Users can view logs" on "public"."workout_logs";

drop policy "Users can delete days from their plans" on "public"."workout_plan_days";

drop policy "Users can insert days into their plans" on "public"."workout_plan_days";

drop policy "Users can update days of their plans" on "public"."workout_plan_days";

drop policy "Users can view days of their plans" on "public"."workout_plan_days";

drop policy "Users can create their own plans" on "public"."workout_plans";

drop policy "Users can delete their own plans" on "public"."workout_plans";

drop policy "Users can update their own plans" on "public"."workout_plans";

drop policy "Users can view their own plans" on "public"."workout_plans";

drop policy "Authenticated users can view sessions" on "public"."workout_sessions";

drop policy "Users can delete own sessions" on "public"."workout_sessions";

drop policy "Users can insert own sessions" on "public"."workout_sessions";

drop policy "Users can update own sessions" on "public"."workout_sessions";

drop policy "Users can view own sessions" on "public"."workout_sessions";

drop policy "Friends can view templates" on "public"."workout_templates";

drop policy "Users can delete own templates" on "public"."workout_templates";

drop policy "Users can insert own templates" on "public"."workout_templates";

drop policy "Users can manage their own templates" on "public"."workout_templates";

drop policy "Users can update own templates" on "public"."workout_templates";

drop policy "Users can view own templates" on "public"."workout_templates";

drop policy "Friends can view workouts" on "public"."workouts";

drop policy "Users can delete own workouts" on "public"."workouts";

drop policy "Users can insert own workouts" on "public"."workouts";

drop policy "Users can manage own workouts" on "public"."workouts";

drop policy "Users can read own workouts" on "public"."workouts";

drop policy "Users can update own workouts" on "public"."workouts";

drop policy "Users can view all workouts" on "public"."workouts";

drop policy "Users can view own workouts" on "public"."workouts";

drop policy "Users can view public workouts" on "public"."workouts";

revoke delete on table "public"."app_languages" from "anon";

revoke insert on table "public"."app_languages" from "anon";

revoke references on table "public"."app_languages" from "anon";

revoke select on table "public"."app_languages" from "anon";

revoke trigger on table "public"."app_languages" from "anon";

revoke truncate on table "public"."app_languages" from "anon";

revoke update on table "public"."app_languages" from "anon";

revoke delete on table "public"."app_languages" from "authenticated";

revoke insert on table "public"."app_languages" from "authenticated";

revoke references on table "public"."app_languages" from "authenticated";

revoke select on table "public"."app_languages" from "authenticated";

revoke trigger on table "public"."app_languages" from "authenticated";

revoke truncate on table "public"."app_languages" from "authenticated";

revoke update on table "public"."app_languages" from "authenticated";

revoke delete on table "public"."app_languages" from "service_role";

revoke insert on table "public"."app_languages" from "service_role";

revoke references on table "public"."app_languages" from "service_role";

revoke select on table "public"."app_languages" from "service_role";

revoke trigger on table "public"."app_languages" from "service_role";

revoke truncate on table "public"."app_languages" from "service_role";

revoke update on table "public"."app_languages" from "service_role";

revoke delete on table "public"."app_translations" from "anon";

revoke insert on table "public"."app_translations" from "anon";

revoke references on table "public"."app_translations" from "anon";

revoke select on table "public"."app_translations" from "anon";

revoke trigger on table "public"."app_translations" from "anon";

revoke truncate on table "public"."app_translations" from "anon";

revoke update on table "public"."app_translations" from "anon";

revoke delete on table "public"."app_translations" from "authenticated";

revoke insert on table "public"."app_translations" from "authenticated";

revoke references on table "public"."app_translations" from "authenticated";

revoke select on table "public"."app_translations" from "authenticated";

revoke trigger on table "public"."app_translations" from "authenticated";

revoke truncate on table "public"."app_translations" from "authenticated";

revoke update on table "public"."app_translations" from "authenticated";

revoke delete on table "public"."app_translations" from "service_role";

revoke insert on table "public"."app_translations" from "service_role";

revoke references on table "public"."app_translations" from "service_role";

revoke select on table "public"."app_translations" from "service_role";

revoke trigger on table "public"."app_translations" from "service_role";

revoke truncate on table "public"."app_translations" from "service_role";

revoke update on table "public"."app_translations" from "service_role";

revoke delete on table "public"."challenge_entries" from "anon";

revoke insert on table "public"."challenge_entries" from "anon";

revoke references on table "public"."challenge_entries" from "anon";

revoke select on table "public"."challenge_entries" from "anon";

revoke trigger on table "public"."challenge_entries" from "anon";

revoke truncate on table "public"."challenge_entries" from "anon";

revoke update on table "public"."challenge_entries" from "anon";

revoke delete on table "public"."challenge_entries" from "authenticated";

revoke insert on table "public"."challenge_entries" from "authenticated";

revoke references on table "public"."challenge_entries" from "authenticated";

revoke select on table "public"."challenge_entries" from "authenticated";

revoke trigger on table "public"."challenge_entries" from "authenticated";

revoke truncate on table "public"."challenge_entries" from "authenticated";

revoke update on table "public"."challenge_entries" from "authenticated";

revoke delete on table "public"."challenge_entries" from "service_role";

revoke insert on table "public"."challenge_entries" from "service_role";

revoke references on table "public"."challenge_entries" from "service_role";

revoke select on table "public"."challenge_entries" from "service_role";

revoke trigger on table "public"."challenge_entries" from "service_role";

revoke truncate on table "public"."challenge_entries" from "service_role";

revoke update on table "public"."challenge_entries" from "service_role";

revoke delete on table "public"."challenge_participants" from "anon";

revoke insert on table "public"."challenge_participants" from "anon";

revoke references on table "public"."challenge_participants" from "anon";

revoke select on table "public"."challenge_participants" from "anon";

revoke trigger on table "public"."challenge_participants" from "anon";

revoke truncate on table "public"."challenge_participants" from "anon";

revoke update on table "public"."challenge_participants" from "anon";

revoke delete on table "public"."challenge_participants" from "authenticated";

revoke insert on table "public"."challenge_participants" from "authenticated";

revoke references on table "public"."challenge_participants" from "authenticated";

revoke select on table "public"."challenge_participants" from "authenticated";

revoke trigger on table "public"."challenge_participants" from "authenticated";

revoke truncate on table "public"."challenge_participants" from "authenticated";

revoke update on table "public"."challenge_participants" from "authenticated";

revoke delete on table "public"."challenge_participants" from "service_role";

revoke insert on table "public"."challenge_participants" from "service_role";

revoke references on table "public"."challenge_participants" from "service_role";

revoke select on table "public"."challenge_participants" from "service_role";

revoke trigger on table "public"."challenge_participants" from "service_role";

revoke truncate on table "public"."challenge_participants" from "service_role";

revoke update on table "public"."challenge_participants" from "service_role";

revoke delete on table "public"."challenge_submissions" from "anon";

revoke insert on table "public"."challenge_submissions" from "anon";

revoke references on table "public"."challenge_submissions" from "anon";

revoke select on table "public"."challenge_submissions" from "anon";

revoke trigger on table "public"."challenge_submissions" from "anon";

revoke truncate on table "public"."challenge_submissions" from "anon";

revoke update on table "public"."challenge_submissions" from "anon";

revoke delete on table "public"."challenge_submissions" from "authenticated";

revoke insert on table "public"."challenge_submissions" from "authenticated";

revoke references on table "public"."challenge_submissions" from "authenticated";

revoke select on table "public"."challenge_submissions" from "authenticated";

revoke trigger on table "public"."challenge_submissions" from "authenticated";

revoke truncate on table "public"."challenge_submissions" from "authenticated";

revoke update on table "public"."challenge_submissions" from "authenticated";

revoke delete on table "public"."challenge_submissions" from "service_role";

revoke insert on table "public"."challenge_submissions" from "service_role";

revoke references on table "public"."challenge_submissions" from "service_role";

revoke select on table "public"."challenge_submissions" from "service_role";

revoke trigger on table "public"."challenge_submissions" from "service_role";

revoke truncate on table "public"."challenge_submissions" from "service_role";

revoke update on table "public"."challenge_submissions" from "service_role";

revoke delete on table "public"."chat_rooms" from "anon";

revoke insert on table "public"."chat_rooms" from "anon";

revoke references on table "public"."chat_rooms" from "anon";

revoke select on table "public"."chat_rooms" from "anon";

revoke trigger on table "public"."chat_rooms" from "anon";

revoke truncate on table "public"."chat_rooms" from "anon";

revoke update on table "public"."chat_rooms" from "anon";

revoke delete on table "public"."chat_rooms" from "authenticated";

revoke insert on table "public"."chat_rooms" from "authenticated";

revoke references on table "public"."chat_rooms" from "authenticated";

revoke select on table "public"."chat_rooms" from "authenticated";

revoke trigger on table "public"."chat_rooms" from "authenticated";

revoke truncate on table "public"."chat_rooms" from "authenticated";

revoke update on table "public"."chat_rooms" from "authenticated";

revoke delete on table "public"."chat_rooms" from "service_role";

revoke insert on table "public"."chat_rooms" from "service_role";

revoke references on table "public"."chat_rooms" from "service_role";

revoke select on table "public"."chat_rooms" from "service_role";

revoke trigger on table "public"."chat_rooms" from "service_role";

revoke truncate on table "public"."chat_rooms" from "service_role";

revoke update on table "public"."chat_rooms" from "service_role";

revoke delete on table "public"."communities" from "anon";

revoke insert on table "public"."communities" from "anon";

revoke references on table "public"."communities" from "anon";

revoke select on table "public"."communities" from "anon";

revoke trigger on table "public"."communities" from "anon";

revoke truncate on table "public"."communities" from "anon";

revoke update on table "public"."communities" from "anon";

revoke delete on table "public"."communities" from "authenticated";

revoke insert on table "public"."communities" from "authenticated";

revoke references on table "public"."communities" from "authenticated";

revoke select on table "public"."communities" from "authenticated";

revoke trigger on table "public"."communities" from "authenticated";

revoke truncate on table "public"."communities" from "authenticated";

revoke update on table "public"."communities" from "authenticated";

revoke delete on table "public"."communities" from "service_role";

revoke insert on table "public"."communities" from "service_role";

revoke references on table "public"."communities" from "service_role";

revoke select on table "public"."communities" from "service_role";

revoke trigger on table "public"."communities" from "service_role";

revoke truncate on table "public"."communities" from "service_role";

revoke update on table "public"."communities" from "service_role";

revoke delete on table "public"."community_members" from "anon";

revoke insert on table "public"."community_members" from "anon";

revoke references on table "public"."community_members" from "anon";

revoke select on table "public"."community_members" from "anon";

revoke trigger on table "public"."community_members" from "anon";

revoke truncate on table "public"."community_members" from "anon";

revoke update on table "public"."community_members" from "anon";

revoke delete on table "public"."community_members" from "authenticated";

revoke insert on table "public"."community_members" from "authenticated";

revoke references on table "public"."community_members" from "authenticated";

revoke select on table "public"."community_members" from "authenticated";

revoke trigger on table "public"."community_members" from "authenticated";

revoke truncate on table "public"."community_members" from "authenticated";

revoke update on table "public"."community_members" from "authenticated";

revoke delete on table "public"."community_members" from "service_role";

revoke insert on table "public"."community_members" from "service_role";

revoke references on table "public"."community_members" from "service_role";

revoke select on table "public"."community_members" from "service_role";

revoke trigger on table "public"."community_members" from "service_role";

revoke truncate on table "public"."community_members" from "service_role";

revoke update on table "public"."community_members" from "service_role";

revoke delete on table "public"."conversation_participants" from "anon";

revoke insert on table "public"."conversation_participants" from "anon";

revoke references on table "public"."conversation_participants" from "anon";

revoke select on table "public"."conversation_participants" from "anon";

revoke trigger on table "public"."conversation_participants" from "anon";

revoke truncate on table "public"."conversation_participants" from "anon";

revoke update on table "public"."conversation_participants" from "anon";

revoke delete on table "public"."conversation_participants" from "authenticated";

revoke insert on table "public"."conversation_participants" from "authenticated";

revoke references on table "public"."conversation_participants" from "authenticated";

revoke select on table "public"."conversation_participants" from "authenticated";

revoke trigger on table "public"."conversation_participants" from "authenticated";

revoke truncate on table "public"."conversation_participants" from "authenticated";

revoke update on table "public"."conversation_participants" from "authenticated";

revoke delete on table "public"."conversation_participants" from "service_role";

revoke insert on table "public"."conversation_participants" from "service_role";

revoke references on table "public"."conversation_participants" from "service_role";

revoke select on table "public"."conversation_participants" from "service_role";

revoke trigger on table "public"."conversation_participants" from "service_role";

revoke truncate on table "public"."conversation_participants" from "service_role";

revoke update on table "public"."conversation_participants" from "service_role";

revoke delete on table "public"."conversations" from "anon";

revoke insert on table "public"."conversations" from "anon";

revoke references on table "public"."conversations" from "anon";

revoke select on table "public"."conversations" from "anon";

revoke trigger on table "public"."conversations" from "anon";

revoke truncate on table "public"."conversations" from "anon";

revoke update on table "public"."conversations" from "anon";

revoke delete on table "public"."conversations" from "authenticated";

revoke insert on table "public"."conversations" from "authenticated";

revoke references on table "public"."conversations" from "authenticated";

revoke select on table "public"."conversations" from "authenticated";

revoke trigger on table "public"."conversations" from "authenticated";

revoke truncate on table "public"."conversations" from "authenticated";

revoke update on table "public"."conversations" from "authenticated";

revoke delete on table "public"."conversations" from "service_role";

revoke insert on table "public"."conversations" from "service_role";

revoke references on table "public"."conversations" from "service_role";

revoke select on table "public"."conversations" from "service_role";

revoke trigger on table "public"."conversations" from "service_role";

revoke truncate on table "public"."conversations" from "service_role";

revoke update on table "public"."conversations" from "service_role";

revoke delete on table "public"."custom_exercises" from "anon";

revoke insert on table "public"."custom_exercises" from "anon";

revoke references on table "public"."custom_exercises" from "anon";

revoke select on table "public"."custom_exercises" from "anon";

revoke trigger on table "public"."custom_exercises" from "anon";

revoke truncate on table "public"."custom_exercises" from "anon";

revoke update on table "public"."custom_exercises" from "anon";

revoke delete on table "public"."custom_exercises" from "authenticated";

revoke insert on table "public"."custom_exercises" from "authenticated";

revoke references on table "public"."custom_exercises" from "authenticated";

revoke select on table "public"."custom_exercises" from "authenticated";

revoke trigger on table "public"."custom_exercises" from "authenticated";

revoke truncate on table "public"."custom_exercises" from "authenticated";

revoke update on table "public"."custom_exercises" from "authenticated";

revoke delete on table "public"."custom_exercises" from "service_role";

revoke insert on table "public"."custom_exercises" from "service_role";

revoke references on table "public"."custom_exercises" from "service_role";

revoke select on table "public"."custom_exercises" from "service_role";

revoke trigger on table "public"."custom_exercises" from "service_role";

revoke truncate on table "public"."custom_exercises" from "service_role";

revoke update on table "public"."custom_exercises" from "service_role";

revoke delete on table "public"."event_participants" from "anon";

revoke insert on table "public"."event_participants" from "anon";

revoke references on table "public"."event_participants" from "anon";

revoke select on table "public"."event_participants" from "anon";

revoke trigger on table "public"."event_participants" from "anon";

revoke truncate on table "public"."event_participants" from "anon";

revoke update on table "public"."event_participants" from "anon";

revoke delete on table "public"."event_participants" from "authenticated";

revoke insert on table "public"."event_participants" from "authenticated";

revoke references on table "public"."event_participants" from "authenticated";

revoke select on table "public"."event_participants" from "authenticated";

revoke trigger on table "public"."event_participants" from "authenticated";

revoke truncate on table "public"."event_participants" from "authenticated";

revoke update on table "public"."event_participants" from "authenticated";

revoke delete on table "public"."event_participants" from "service_role";

revoke insert on table "public"."event_participants" from "service_role";

revoke references on table "public"."event_participants" from "service_role";

revoke select on table "public"."event_participants" from "service_role";

revoke trigger on table "public"."event_participants" from "service_role";

revoke truncate on table "public"."event_participants" from "service_role";

revoke update on table "public"."event_participants" from "service_role";

revoke delete on table "public"."exercises" from "anon";

revoke insert on table "public"."exercises" from "anon";

revoke references on table "public"."exercises" from "anon";

revoke select on table "public"."exercises" from "anon";

revoke trigger on table "public"."exercises" from "anon";

revoke truncate on table "public"."exercises" from "anon";

revoke update on table "public"."exercises" from "anon";

revoke delete on table "public"."exercises" from "authenticated";

revoke insert on table "public"."exercises" from "authenticated";

revoke references on table "public"."exercises" from "authenticated";

revoke select on table "public"."exercises" from "authenticated";

revoke trigger on table "public"."exercises" from "authenticated";

revoke truncate on table "public"."exercises" from "authenticated";

revoke update on table "public"."exercises" from "authenticated";

revoke delete on table "public"."exercises" from "service_role";

revoke insert on table "public"."exercises" from "service_role";

revoke references on table "public"."exercises" from "service_role";

revoke select on table "public"."exercises" from "service_role";

revoke trigger on table "public"."exercises" from "service_role";

revoke truncate on table "public"."exercises" from "service_role";

revoke update on table "public"."exercises" from "service_role";

revoke delete on table "public"."friendships" from "anon";

revoke insert on table "public"."friendships" from "anon";

revoke references on table "public"."friendships" from "anon";

revoke select on table "public"."friendships" from "anon";

revoke trigger on table "public"."friendships" from "anon";

revoke truncate on table "public"."friendships" from "anon";

revoke update on table "public"."friendships" from "anon";

revoke delete on table "public"."friendships" from "authenticated";

revoke insert on table "public"."friendships" from "authenticated";

revoke references on table "public"."friendships" from "authenticated";

revoke select on table "public"."friendships" from "authenticated";

revoke trigger on table "public"."friendships" from "authenticated";

revoke truncate on table "public"."friendships" from "authenticated";

revoke update on table "public"."friendships" from "authenticated";

revoke delete on table "public"."friendships" from "service_role";

revoke insert on table "public"."friendships" from "service_role";

revoke references on table "public"."friendships" from "service_role";

revoke select on table "public"."friendships" from "service_role";

revoke trigger on table "public"."friendships" from "service_role";

revoke truncate on table "public"."friendships" from "service_role";

revoke update on table "public"."friendships" from "service_role";

revoke delete on table "public"."gym_challenges" from "anon";

revoke insert on table "public"."gym_challenges" from "anon";

revoke references on table "public"."gym_challenges" from "anon";

revoke select on table "public"."gym_challenges" from "anon";

revoke trigger on table "public"."gym_challenges" from "anon";

revoke truncate on table "public"."gym_challenges" from "anon";

revoke update on table "public"."gym_challenges" from "anon";

revoke delete on table "public"."gym_challenges" from "authenticated";

revoke insert on table "public"."gym_challenges" from "authenticated";

revoke references on table "public"."gym_challenges" from "authenticated";

revoke select on table "public"."gym_challenges" from "authenticated";

revoke trigger on table "public"."gym_challenges" from "authenticated";

revoke truncate on table "public"."gym_challenges" from "authenticated";

revoke update on table "public"."gym_challenges" from "authenticated";

revoke delete on table "public"."gym_challenges" from "service_role";

revoke insert on table "public"."gym_challenges" from "service_role";

revoke references on table "public"."gym_challenges" from "service_role";

revoke select on table "public"."gym_challenges" from "service_role";

revoke trigger on table "public"."gym_challenges" from "service_role";

revoke truncate on table "public"."gym_challenges" from "service_role";

revoke update on table "public"."gym_challenges" from "service_role";

revoke delete on table "public"."gym_events" from "anon";

revoke insert on table "public"."gym_events" from "anon";

revoke references on table "public"."gym_events" from "anon";

revoke select on table "public"."gym_events" from "anon";

revoke trigger on table "public"."gym_events" from "anon";

revoke truncate on table "public"."gym_events" from "anon";

revoke update on table "public"."gym_events" from "anon";

revoke delete on table "public"."gym_events" from "authenticated";

revoke insert on table "public"."gym_events" from "authenticated";

revoke references on table "public"."gym_events" from "authenticated";

revoke select on table "public"."gym_events" from "authenticated";

revoke trigger on table "public"."gym_events" from "authenticated";

revoke truncate on table "public"."gym_events" from "authenticated";

revoke update on table "public"."gym_events" from "authenticated";

revoke delete on table "public"."gym_events" from "service_role";

revoke insert on table "public"."gym_events" from "service_role";

revoke references on table "public"."gym_events" from "service_role";

revoke select on table "public"."gym_events" from "service_role";

revoke trigger on table "public"."gym_events" from "service_role";

revoke truncate on table "public"."gym_events" from "service_role";

revoke update on table "public"."gym_events" from "service_role";

revoke delete on table "public"."gym_invites" from "anon";

revoke insert on table "public"."gym_invites" from "anon";

revoke references on table "public"."gym_invites" from "anon";

revoke select on table "public"."gym_invites" from "anon";

revoke trigger on table "public"."gym_invites" from "anon";

revoke truncate on table "public"."gym_invites" from "anon";

revoke update on table "public"."gym_invites" from "anon";

revoke delete on table "public"."gym_invites" from "authenticated";

revoke insert on table "public"."gym_invites" from "authenticated";

revoke references on table "public"."gym_invites" from "authenticated";

revoke select on table "public"."gym_invites" from "authenticated";

revoke trigger on table "public"."gym_invites" from "authenticated";

revoke truncate on table "public"."gym_invites" from "authenticated";

revoke update on table "public"."gym_invites" from "authenticated";

revoke delete on table "public"."gym_invites" from "service_role";

revoke insert on table "public"."gym_invites" from "service_role";

revoke references on table "public"."gym_invites" from "service_role";

revoke select on table "public"."gym_invites" from "service_role";

revoke trigger on table "public"."gym_invites" from "service_role";

revoke truncate on table "public"."gym_invites" from "service_role";

revoke update on table "public"."gym_invites" from "service_role";

revoke delete on table "public"."gym_monitors" from "anon";

revoke insert on table "public"."gym_monitors" from "anon";

revoke references on table "public"."gym_monitors" from "anon";

revoke select on table "public"."gym_monitors" from "anon";

revoke trigger on table "public"."gym_monitors" from "anon";

revoke truncate on table "public"."gym_monitors" from "anon";

revoke update on table "public"."gym_monitors" from "anon";

revoke delete on table "public"."gym_monitors" from "authenticated";

revoke insert on table "public"."gym_monitors" from "authenticated";

revoke references on table "public"."gym_monitors" from "authenticated";

revoke select on table "public"."gym_monitors" from "authenticated";

revoke trigger on table "public"."gym_monitors" from "authenticated";

revoke truncate on table "public"."gym_monitors" from "authenticated";

revoke update on table "public"."gym_monitors" from "authenticated";

revoke delete on table "public"."gym_monitors" from "service_role";

revoke insert on table "public"."gym_monitors" from "service_role";

revoke references on table "public"."gym_monitors" from "service_role";

revoke select on table "public"."gym_monitors" from "service_role";

revoke trigger on table "public"."gym_monitors" from "service_role";

revoke truncate on table "public"."gym_monitors" from "service_role";

revoke update on table "public"."gym_monitors" from "service_role";

revoke delete on table "public"."gym_news" from "anon";

revoke insert on table "public"."gym_news" from "anon";

revoke references on table "public"."gym_news" from "anon";

revoke select on table "public"."gym_news" from "anon";

revoke trigger on table "public"."gym_news" from "anon";

revoke truncate on table "public"."gym_news" from "anon";

revoke update on table "public"."gym_news" from "anon";

revoke delete on table "public"."gym_news" from "authenticated";

revoke insert on table "public"."gym_news" from "authenticated";

revoke references on table "public"."gym_news" from "authenticated";

revoke select on table "public"."gym_news" from "authenticated";

revoke trigger on table "public"."gym_news" from "authenticated";

revoke truncate on table "public"."gym_news" from "authenticated";

revoke update on table "public"."gym_news" from "authenticated";

revoke delete on table "public"."gym_news" from "service_role";

revoke insert on table "public"."gym_news" from "service_role";

revoke references on table "public"."gym_news" from "service_role";

revoke select on table "public"."gym_news" from "service_role";

revoke trigger on table "public"."gym_news" from "service_role";

revoke truncate on table "public"."gym_news" from "service_role";

revoke update on table "public"."gym_news" from "service_role";

revoke delete on table "public"."gym_tv_settings" from "anon";

revoke insert on table "public"."gym_tv_settings" from "anon";

revoke references on table "public"."gym_tv_settings" from "anon";

revoke select on table "public"."gym_tv_settings" from "anon";

revoke trigger on table "public"."gym_tv_settings" from "anon";

revoke truncate on table "public"."gym_tv_settings" from "anon";

revoke update on table "public"."gym_tv_settings" from "anon";

revoke delete on table "public"."gym_tv_settings" from "authenticated";

revoke insert on table "public"."gym_tv_settings" from "authenticated";

revoke references on table "public"."gym_tv_settings" from "authenticated";

revoke select on table "public"."gym_tv_settings" from "authenticated";

revoke trigger on table "public"."gym_tv_settings" from "authenticated";

revoke truncate on table "public"."gym_tv_settings" from "authenticated";

revoke update on table "public"."gym_tv_settings" from "authenticated";

revoke delete on table "public"."gym_tv_settings" from "service_role";

revoke insert on table "public"."gym_tv_settings" from "service_role";

revoke references on table "public"."gym_tv_settings" from "service_role";

revoke select on table "public"."gym_tv_settings" from "service_role";

revoke trigger on table "public"."gym_tv_settings" from "service_role";

revoke truncate on table "public"."gym_tv_settings" from "service_role";

revoke update on table "public"."gym_tv_settings" from "service_role";

revoke delete on table "public"."gyms" from "anon";

revoke insert on table "public"."gyms" from "anon";

revoke references on table "public"."gyms" from "anon";

revoke select on table "public"."gyms" from "anon";

revoke trigger on table "public"."gyms" from "anon";

revoke truncate on table "public"."gyms" from "anon";

revoke update on table "public"."gyms" from "anon";

revoke delete on table "public"."gyms" from "authenticated";

revoke insert on table "public"."gyms" from "authenticated";

revoke references on table "public"."gyms" from "authenticated";

revoke select on table "public"."gyms" from "authenticated";

revoke trigger on table "public"."gyms" from "authenticated";

revoke truncate on table "public"."gyms" from "authenticated";

revoke update on table "public"."gyms" from "authenticated";

revoke delete on table "public"."gyms" from "service_role";

revoke insert on table "public"."gyms" from "service_role";

revoke references on table "public"."gyms" from "service_role";

revoke select on table "public"."gyms" from "service_role";

revoke trigger on table "public"."gyms" from "service_role";

revoke truncate on table "public"."gyms" from "service_role";

revoke update on table "public"."gyms" from "service_role";

revoke delete on table "public"."messages" from "anon";

revoke insert on table "public"."messages" from "anon";

revoke references on table "public"."messages" from "anon";

revoke select on table "public"."messages" from "anon";

revoke trigger on table "public"."messages" from "anon";

revoke truncate on table "public"."messages" from "anon";

revoke update on table "public"."messages" from "anon";

revoke delete on table "public"."messages" from "authenticated";

revoke insert on table "public"."messages" from "authenticated";

revoke references on table "public"."messages" from "authenticated";

revoke select on table "public"."messages" from "authenticated";

revoke trigger on table "public"."messages" from "authenticated";

revoke truncate on table "public"."messages" from "authenticated";

revoke update on table "public"."messages" from "authenticated";

revoke delete on table "public"."messages" from "service_role";

revoke insert on table "public"."messages" from "service_role";

revoke references on table "public"."messages" from "service_role";

revoke select on table "public"."messages" from "service_role";

revoke trigger on table "public"."messages" from "service_role";

revoke truncate on table "public"."messages" from "service_role";

revoke update on table "public"."messages" from "service_role";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."notifications" from "authenticated";

revoke insert on table "public"."notifications" from "authenticated";

revoke references on table "public"."notifications" from "authenticated";

revoke select on table "public"."notifications" from "authenticated";

revoke trigger on table "public"."notifications" from "authenticated";

revoke truncate on table "public"."notifications" from "authenticated";

revoke update on table "public"."notifications" from "authenticated";

revoke delete on table "public"."notifications" from "service_role";

revoke insert on table "public"."notifications" from "service_role";

revoke references on table "public"."notifications" from "service_role";

revoke select on table "public"."notifications" from "service_role";

revoke trigger on table "public"."notifications" from "service_role";

revoke truncate on table "public"."notifications" from "service_role";

revoke update on table "public"."notifications" from "service_role";

revoke delete on table "public"."plan_assignments" from "anon";

revoke insert on table "public"."plan_assignments" from "anon";

revoke references on table "public"."plan_assignments" from "anon";

revoke select on table "public"."plan_assignments" from "anon";

revoke trigger on table "public"."plan_assignments" from "anon";

revoke truncate on table "public"."plan_assignments" from "anon";

revoke update on table "public"."plan_assignments" from "anon";

revoke delete on table "public"."plan_assignments" from "authenticated";

revoke insert on table "public"."plan_assignments" from "authenticated";

revoke references on table "public"."plan_assignments" from "authenticated";

revoke select on table "public"."plan_assignments" from "authenticated";

revoke trigger on table "public"."plan_assignments" from "authenticated";

revoke truncate on table "public"."plan_assignments" from "authenticated";

revoke update on table "public"."plan_assignments" from "authenticated";

revoke delete on table "public"."plan_assignments" from "service_role";

revoke insert on table "public"."plan_assignments" from "service_role";

revoke references on table "public"."plan_assignments" from "service_role";

revoke select on table "public"."plan_assignments" from "service_role";

revoke trigger on table "public"."plan_assignments" from "service_role";

revoke truncate on table "public"."plan_assignments" from "service_role";

revoke update on table "public"."plan_assignments" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."room_members" from "anon";

revoke insert on table "public"."room_members" from "anon";

revoke references on table "public"."room_members" from "anon";

revoke select on table "public"."room_members" from "anon";

revoke trigger on table "public"."room_members" from "anon";

revoke truncate on table "public"."room_members" from "anon";

revoke update on table "public"."room_members" from "anon";

revoke delete on table "public"."room_members" from "authenticated";

revoke insert on table "public"."room_members" from "authenticated";

revoke references on table "public"."room_members" from "authenticated";

revoke select on table "public"."room_members" from "authenticated";

revoke trigger on table "public"."room_members" from "authenticated";

revoke truncate on table "public"."room_members" from "authenticated";

revoke update on table "public"."room_members" from "authenticated";

revoke delete on table "public"."room_members" from "service_role";

revoke insert on table "public"."room_members" from "service_role";

revoke references on table "public"."room_members" from "service_role";

revoke select on table "public"."room_members" from "service_role";

revoke trigger on table "public"."room_members" from "service_role";

revoke truncate on table "public"."room_members" from "service_role";

revoke update on table "public"."room_members" from "service_role";

revoke delete on table "public"."streaks" from "anon";

revoke insert on table "public"."streaks" from "anon";

revoke references on table "public"."streaks" from "anon";

revoke select on table "public"."streaks" from "anon";

revoke trigger on table "public"."streaks" from "anon";

revoke truncate on table "public"."streaks" from "anon";

revoke update on table "public"."streaks" from "anon";

revoke delete on table "public"."streaks" from "authenticated";

revoke insert on table "public"."streaks" from "authenticated";

revoke references on table "public"."streaks" from "authenticated";

revoke select on table "public"."streaks" from "authenticated";

revoke trigger on table "public"."streaks" from "authenticated";

revoke truncate on table "public"."streaks" from "authenticated";

revoke update on table "public"."streaks" from "authenticated";

revoke delete on table "public"."streaks" from "service_role";

revoke insert on table "public"."streaks" from "service_role";

revoke references on table "public"."streaks" from "service_role";

revoke select on table "public"."streaks" from "service_role";

revoke trigger on table "public"."streaks" from "service_role";

revoke truncate on table "public"."streaks" from "service_role";

revoke update on table "public"."streaks" from "service_role";

revoke delete on table "public"."trainer_relationships" from "anon";

revoke insert on table "public"."trainer_relationships" from "anon";

revoke references on table "public"."trainer_relationships" from "anon";

revoke select on table "public"."trainer_relationships" from "anon";

revoke trigger on table "public"."trainer_relationships" from "anon";

revoke truncate on table "public"."trainer_relationships" from "anon";

revoke update on table "public"."trainer_relationships" from "anon";

revoke delete on table "public"."trainer_relationships" from "authenticated";

revoke insert on table "public"."trainer_relationships" from "authenticated";

revoke references on table "public"."trainer_relationships" from "authenticated";

revoke select on table "public"."trainer_relationships" from "authenticated";

revoke trigger on table "public"."trainer_relationships" from "authenticated";

revoke truncate on table "public"."trainer_relationships" from "authenticated";

revoke update on table "public"."trainer_relationships" from "authenticated";

revoke delete on table "public"."trainer_relationships" from "service_role";

revoke insert on table "public"."trainer_relationships" from "service_role";

revoke references on table "public"."trainer_relationships" from "service_role";

revoke select on table "public"."trainer_relationships" from "service_role";

revoke trigger on table "public"."trainer_relationships" from "service_role";

revoke truncate on table "public"."trainer_relationships" from "service_role";

revoke update on table "public"."trainer_relationships" from "service_role";

revoke delete on table "public"."user_gyms" from "anon";

revoke insert on table "public"."user_gyms" from "anon";

revoke references on table "public"."user_gyms" from "anon";

revoke select on table "public"."user_gyms" from "anon";

revoke trigger on table "public"."user_gyms" from "anon";

revoke truncate on table "public"."user_gyms" from "anon";

revoke update on table "public"."user_gyms" from "anon";

revoke delete on table "public"."user_gyms" from "authenticated";

revoke insert on table "public"."user_gyms" from "authenticated";

revoke references on table "public"."user_gyms" from "authenticated";

revoke select on table "public"."user_gyms" from "authenticated";

revoke trigger on table "public"."user_gyms" from "authenticated";

revoke truncate on table "public"."user_gyms" from "authenticated";

revoke update on table "public"."user_gyms" from "authenticated";

revoke delete on table "public"."user_gyms" from "service_role";

revoke insert on table "public"."user_gyms" from "service_role";

revoke references on table "public"."user_gyms" from "service_role";

revoke select on table "public"."user_gyms" from "service_role";

revoke trigger on table "public"."user_gyms" from "service_role";

revoke truncate on table "public"."user_gyms" from "service_role";

revoke update on table "public"."user_gyms" from "service_role";

revoke delete on table "public"."workout_likes" from "anon";

revoke insert on table "public"."workout_likes" from "anon";

revoke references on table "public"."workout_likes" from "anon";

revoke select on table "public"."workout_likes" from "anon";

revoke trigger on table "public"."workout_likes" from "anon";

revoke truncate on table "public"."workout_likes" from "anon";

revoke update on table "public"."workout_likes" from "anon";

revoke delete on table "public"."workout_likes" from "authenticated";

revoke insert on table "public"."workout_likes" from "authenticated";

revoke references on table "public"."workout_likes" from "authenticated";

revoke select on table "public"."workout_likes" from "authenticated";

revoke trigger on table "public"."workout_likes" from "authenticated";

revoke truncate on table "public"."workout_likes" from "authenticated";

revoke update on table "public"."workout_likes" from "authenticated";

revoke delete on table "public"."workout_likes" from "service_role";

revoke insert on table "public"."workout_likes" from "service_role";

revoke references on table "public"."workout_likes" from "service_role";

revoke select on table "public"."workout_likes" from "service_role";

revoke trigger on table "public"."workout_likes" from "service_role";

revoke truncate on table "public"."workout_likes" from "service_role";

revoke update on table "public"."workout_likes" from "service_role";

revoke delete on table "public"."workout_logs" from "anon";

revoke insert on table "public"."workout_logs" from "anon";

revoke references on table "public"."workout_logs" from "anon";

revoke select on table "public"."workout_logs" from "anon";

revoke trigger on table "public"."workout_logs" from "anon";

revoke truncate on table "public"."workout_logs" from "anon";

revoke update on table "public"."workout_logs" from "anon";

revoke delete on table "public"."workout_logs" from "authenticated";

revoke insert on table "public"."workout_logs" from "authenticated";

revoke references on table "public"."workout_logs" from "authenticated";

revoke select on table "public"."workout_logs" from "authenticated";

revoke trigger on table "public"."workout_logs" from "authenticated";

revoke truncate on table "public"."workout_logs" from "authenticated";

revoke update on table "public"."workout_logs" from "authenticated";

revoke delete on table "public"."workout_logs" from "service_role";

revoke insert on table "public"."workout_logs" from "service_role";

revoke references on table "public"."workout_logs" from "service_role";

revoke select on table "public"."workout_logs" from "service_role";

revoke trigger on table "public"."workout_logs" from "service_role";

revoke truncate on table "public"."workout_logs" from "service_role";

revoke update on table "public"."workout_logs" from "service_role";

revoke delete on table "public"."workout_plan_days" from "anon";

revoke insert on table "public"."workout_plan_days" from "anon";

revoke references on table "public"."workout_plan_days" from "anon";

revoke select on table "public"."workout_plan_days" from "anon";

revoke trigger on table "public"."workout_plan_days" from "anon";

revoke truncate on table "public"."workout_plan_days" from "anon";

revoke update on table "public"."workout_plan_days" from "anon";

revoke delete on table "public"."workout_plan_days" from "authenticated";

revoke insert on table "public"."workout_plan_days" from "authenticated";

revoke references on table "public"."workout_plan_days" from "authenticated";

revoke select on table "public"."workout_plan_days" from "authenticated";

revoke trigger on table "public"."workout_plan_days" from "authenticated";

revoke truncate on table "public"."workout_plan_days" from "authenticated";

revoke update on table "public"."workout_plan_days" from "authenticated";

revoke delete on table "public"."workout_plan_days" from "service_role";

revoke insert on table "public"."workout_plan_days" from "service_role";

revoke references on table "public"."workout_plan_days" from "service_role";

revoke select on table "public"."workout_plan_days" from "service_role";

revoke trigger on table "public"."workout_plan_days" from "service_role";

revoke truncate on table "public"."workout_plan_days" from "service_role";

revoke update on table "public"."workout_plan_days" from "service_role";

revoke delete on table "public"."workout_plans" from "anon";

revoke insert on table "public"."workout_plans" from "anon";

revoke references on table "public"."workout_plans" from "anon";

revoke select on table "public"."workout_plans" from "anon";

revoke trigger on table "public"."workout_plans" from "anon";

revoke truncate on table "public"."workout_plans" from "anon";

revoke update on table "public"."workout_plans" from "anon";

revoke delete on table "public"."workout_plans" from "authenticated";

revoke insert on table "public"."workout_plans" from "authenticated";

revoke references on table "public"."workout_plans" from "authenticated";

revoke select on table "public"."workout_plans" from "authenticated";

revoke trigger on table "public"."workout_plans" from "authenticated";

revoke truncate on table "public"."workout_plans" from "authenticated";

revoke update on table "public"."workout_plans" from "authenticated";

revoke delete on table "public"."workout_plans" from "service_role";

revoke insert on table "public"."workout_plans" from "service_role";

revoke references on table "public"."workout_plans" from "service_role";

revoke select on table "public"."workout_plans" from "service_role";

revoke trigger on table "public"."workout_plans" from "service_role";

revoke truncate on table "public"."workout_plans" from "service_role";

revoke update on table "public"."workout_plans" from "service_role";

revoke delete on table "public"."workout_sessions" from "anon";

revoke insert on table "public"."workout_sessions" from "anon";

revoke references on table "public"."workout_sessions" from "anon";

revoke select on table "public"."workout_sessions" from "anon";

revoke trigger on table "public"."workout_sessions" from "anon";

revoke truncate on table "public"."workout_sessions" from "anon";

revoke update on table "public"."workout_sessions" from "anon";

revoke delete on table "public"."workout_sessions" from "authenticated";

revoke insert on table "public"."workout_sessions" from "authenticated";

revoke references on table "public"."workout_sessions" from "authenticated";

revoke select on table "public"."workout_sessions" from "authenticated";

revoke trigger on table "public"."workout_sessions" from "authenticated";

revoke truncate on table "public"."workout_sessions" from "authenticated";

revoke update on table "public"."workout_sessions" from "authenticated";

revoke delete on table "public"."workout_sessions" from "service_role";

revoke insert on table "public"."workout_sessions" from "service_role";

revoke references on table "public"."workout_sessions" from "service_role";

revoke select on table "public"."workout_sessions" from "service_role";

revoke trigger on table "public"."workout_sessions" from "service_role";

revoke truncate on table "public"."workout_sessions" from "service_role";

revoke update on table "public"."workout_sessions" from "service_role";

revoke delete on table "public"."workout_templates" from "anon";

revoke insert on table "public"."workout_templates" from "anon";

revoke references on table "public"."workout_templates" from "anon";

revoke select on table "public"."workout_templates" from "anon";

revoke trigger on table "public"."workout_templates" from "anon";

revoke truncate on table "public"."workout_templates" from "anon";

revoke update on table "public"."workout_templates" from "anon";

revoke delete on table "public"."workout_templates" from "authenticated";

revoke insert on table "public"."workout_templates" from "authenticated";

revoke references on table "public"."workout_templates" from "authenticated";

revoke select on table "public"."workout_templates" from "authenticated";

revoke trigger on table "public"."workout_templates" from "authenticated";

revoke truncate on table "public"."workout_templates" from "authenticated";

revoke update on table "public"."workout_templates" from "authenticated";

revoke delete on table "public"."workout_templates" from "service_role";

revoke insert on table "public"."workout_templates" from "service_role";

revoke references on table "public"."workout_templates" from "service_role";

revoke select on table "public"."workout_templates" from "service_role";

revoke trigger on table "public"."workout_templates" from "service_role";

revoke truncate on table "public"."workout_templates" from "service_role";

revoke update on table "public"."workout_templates" from "service_role";

revoke delete on table "public"."workouts" from "anon";

revoke insert on table "public"."workouts" from "anon";

revoke references on table "public"."workouts" from "anon";

revoke select on table "public"."workouts" from "anon";

revoke trigger on table "public"."workouts" from "anon";

revoke truncate on table "public"."workouts" from "anon";

revoke update on table "public"."workouts" from "anon";

revoke delete on table "public"."workouts" from "authenticated";

revoke insert on table "public"."workouts" from "authenticated";

revoke references on table "public"."workouts" from "authenticated";

revoke select on table "public"."workouts" from "authenticated";

revoke trigger on table "public"."workouts" from "authenticated";

revoke truncate on table "public"."workouts" from "authenticated";

revoke update on table "public"."workouts" from "authenticated";

revoke delete on table "public"."workouts" from "service_role";

revoke insert on table "public"."workouts" from "service_role";

revoke references on table "public"."workouts" from "service_role";

revoke select on table "public"."workouts" from "service_role";

revoke trigger on table "public"."workouts" from "service_role";

revoke truncate on table "public"."workouts" from "service_role";

revoke update on table "public"."workouts" from "service_role";

alter table "public"."app_translations" drop constraint "app_translations_key_key";

alter table "public"."challenge_entries" drop constraint "challenge_entries_challenge_id_fkey";

alter table "public"."challenge_entries" drop constraint "challenge_entries_status_check";

alter table "public"."challenge_entries" drop constraint "challenge_entries_user_id_fkey";

alter table "public"."challenge_participants" drop constraint "challenge_participants_challenge_id_fkey";

alter table "public"."challenge_participants" drop constraint "challenge_participants_challenge_id_user_id_key";

alter table "public"."challenge_participants" drop constraint "challenge_participants_status_check";

alter table "public"."challenge_participants" drop constraint "challenge_participants_user_id_fkey";

alter table "public"."challenge_submissions" drop constraint "challenge_submissions_challenge_id_fkey";

alter table "public"."challenge_submissions" drop constraint "challenge_submissions_status_check";

alter table "public"."challenge_submissions" drop constraint "challenge_submissions_user_id_fkey";

alter table "public"."challenge_submissions" drop constraint "challenge_submissions_verified_by_fkey";

alter table "public"."communities" drop constraint "communities_created_by_fkey";

alter table "public"."communities" drop constraint "communities_gym_id_fkey";

alter table "public"."communities" drop constraint "communities_gym_id_key";

alter table "public"."communities" drop constraint "communities_gym_type_check";

alter table "public"."community_members" drop constraint "community_members_community_id_fkey";

alter table "public"."community_members" drop constraint "community_members_user_id_fkey";

alter table "public"."community_members" drop constraint "community_members_user_id_fkey_profiles";

alter table "public"."conversation_participants" drop constraint "conversation_participants_conversation_id_fkey";

alter table "public"."conversation_participants" drop constraint "conversation_participants_user_id_fkey";

alter table "public"."conversations" drop constraint "conversations_type_check";

alter table "public"."custom_exercises" drop constraint "custom_exercises_user_id_fkey";

alter table "public"."event_participants" drop constraint "event_participants_event_id_fkey";

alter table "public"."event_participants" drop constraint "event_participants_event_id_user_id_key";

alter table "public"."event_participants" drop constraint "event_participants_status_check";

alter table "public"."event_participants" drop constraint "event_participants_user_id_fkey";

alter table "public"."exercises" drop constraint "exercises_name_key";

alter table "public"."friendships" drop constraint "friendships_friend_id_fkey";

alter table "public"."friendships" drop constraint "friendships_status_check";

alter table "public"."friendships" drop constraint "friendships_user_id_fkey";

alter table "public"."friendships" drop constraint "not_self";

alter table "public"."friendships" drop constraint "unique_friendship";

alter table "public"."gym_challenges" drop constraint "gym_challenges_gym_id_fkey";

alter table "public"."gym_events" drop constraint "gym_events_gym_id_fkey";

alter table "public"."gym_invites" drop constraint "gym_invites_code_key";

alter table "public"."gym_invites" drop constraint "gym_invites_created_by_fkey";

alter table "public"."gym_invites" drop constraint "gym_invites_gym_id_fkey";

alter table "public"."gym_invites" drop constraint "gym_invites_role_check";

alter table "public"."gym_monitors" drop constraint "gym_monitors_gym_id_fkey";

alter table "public"."gym_monitors" drop constraint "gym_monitors_pairing_code_key";

alter table "public"."gym_monitors" drop constraint "gym_monitors_status_check";

alter table "public"."gym_news" drop constraint "gym_news_gym_id_fkey";

alter table "public"."gym_tv_settings" drop constraint "gym_tv_settings_gym_id_fkey";

alter table "public"."gyms" drop constraint "gyms_access_code_admin_key";

alter table "public"."gyms" drop constraint "gyms_access_code_trainer_key";

alter table "public"."gyms" drop constraint "gyms_created_by_fkey";

alter table "public"."gyms" drop constraint "gyms_source_check";

alter table "public"."messages" drop constraint "messages_conversation_id_fkey";

alter table "public"."messages" drop constraint "messages_sender_id_fkey";

alter table "public"."notifications" drop constraint "notifications_user_id_fkey";

alter table "public"."plan_assignments" drop constraint "plan_assignments_client_id_fkey";

alter table "public"."plan_assignments" drop constraint "plan_assignments_plan_id_fkey";

alter table "public"."plan_assignments" drop constraint "plan_assignments_trainer_id_fkey";

alter table "public"."profiles" drop constraint "profiles_home_gym_id_fkey";

alter table "public"."profiles" drop constraint "profiles_id_fkey";

alter table "public"."profiles" drop constraint "profiles_trainer_code_key";

alter table "public"."profiles" drop constraint "profiles_username_key";

alter table "public"."profiles" drop constraint "username_alphanumeric";

alter table "public"."profiles" drop constraint "username_length";

alter table "public"."room_members" drop constraint "room_members_room_id_fkey";

alter table "public"."room_members" drop constraint "room_members_user_id_fkey";

alter table "public"."streaks" drop constraint "streaks_user_id_fkey";

alter table "public"."trainer_relationships" drop constraint "trainer_relationships_client_id_fkey";

alter table "public"."trainer_relationships" drop constraint "trainer_relationships_gym_id_fkey";

alter table "public"."trainer_relationships" drop constraint "trainer_relationships_status_check";

alter table "public"."trainer_relationships" drop constraint "trainer_relationships_trainer_id_client_id_key";

alter table "public"."trainer_relationships" drop constraint "trainer_relationships_trainer_id_fkey";

alter table "public"."user_gyms" drop constraint "user_gyms_gym_id_fkey";

alter table "public"."user_gyms" drop constraint "user_gyms_user_id_fkey";

alter table "public"."workout_likes" drop constraint "workout_likes_user_id_fkey";

alter table "public"."workout_likes" drop constraint "workout_likes_workout_id_fkey";

alter table "public"."workout_likes" drop constraint "workout_likes_workout_id_user_id_key";

alter table "public"."workout_logs" drop constraint "workout_logs_workout_id_fkey";

alter table "public"."workout_plan_days" drop constraint "workout_plan_days_plan_id_fkey";

alter table "public"."workout_plan_days" drop constraint "workout_plan_days_template_id_fkey";

alter table "public"."workout_plans" drop constraint "workout_plans_user_id_fkey";

alter table "public"."workout_sessions" drop constraint "workout_sessions_gym_id_fkey";

alter table "public"."workout_sessions" drop constraint "workout_sessions_status_check";

alter table "public"."workout_sessions" drop constraint "workout_sessions_type_check";

alter table "public"."workout_sessions" drop constraint "workout_sessions_user_id_fkey";

alter table "public"."workout_templates" drop constraint "workout_templates_user_id_fkey";

alter table "public"."workout_templates" drop constraint "workout_templates_visibility_check";

alter table "public"."workouts" drop constraint "fk_workouts_profiles";

alter table "public"."workouts" drop constraint "workouts_gym_id_fkey";

alter table "public"."workouts" drop constraint "workouts_plan_id_fkey";

alter table "public"."workouts" drop constraint "workouts_user_id_fkey";

alter table "public"."workouts" drop constraint "workouts_visibility_check";

drop function if exists "public"."admin_search_users"(search_term text);

drop function if exists "public"."auto_accept_bot_friend"();

drop function if exists "public"."check_is_gym_member"(p_gym_id uuid);

drop function if exists "public"."cleanup_my_data"();

drop function if exists "public"."cleanup_stale_sessions"(timeout_minutes integer);

drop function if exists "public"."delete_own_user"();

drop function if exists "public"."delete_workout"(target_workout_id uuid);

drop function if exists "public"."disconnect_gym_monitor"(p_monitor_id uuid);

drop function if exists "public"."find_gym_member_by_email"(p_gym_id uuid, p_email text);

drop function if exists "public"."generate_gym_code"(length integer);

drop function if exists "public"."generate_trainer_code"();

drop function if exists "public"."get_admin_gym_summaries"();

drop function if exists "public"."get_admin_gyms_paginated"(p_page_size integer, p_page integer, p_search text);

drop function if exists "public"."get_gym_coordinates"(gym_ids uuid[]);

drop function if exists "public"."get_gym_leaderboard"(p_gym_id uuid, p_display_key text);

drop function if exists "public"."get_gym_leaderboard"(p_gym_id uuid, p_metric text, p_days integer);

drop function if exists "public"."get_gym_leaderboard"(p_gym_id uuid, p_period text, p_metric text, p_limit integer);

drop function if exists "public"."get_gyms_nearby"(lat double precision, lng double precision, radius_meters double precision);

drop function if exists "public"."get_live_gym_activity"(p_gym_id uuid, p_display_key text);

drop function if exists "public"."get_live_gym_activity_v2"(p_gym_id uuid);

drop function if exists "public"."get_my_trainer_code"();

drop function if exists "public"."get_platform_stats"();

drop function if exists "public"."invite_client_by_id"(p_client_id uuid);

drop function if exists "public"."is_chat_member"(_conversation_id uuid);

drop function if exists "public"."is_participant"(_conversation_id uuid);

drop function if exists "public"."join_gym_with_code"(p_code text);

drop function if exists "public"."join_trainer_with_code"(p_code text);

drop function if exists "public"."link_gym_monitor"(p_code text, p_gym_id uuid);

drop function if exists "public"."regenerate_gym_codes"(p_gym_id uuid);

drop function if exists "public"."register_new_monitor_device"(p_code text);

drop function if exists "public"."request_gym_handover"(p_gym_id uuid);

drop function if exists "public"."search_profiles_secure"(p_query text);

drop function if exists "public"."set_gym_access_codes"();

drop function if exists "public"."submit_challenge_result"(p_challenge_id uuid, p_value numeric, p_proof_url text, p_note text);

drop function if exists "public"."update_community_member_count"();

drop function if exists "public"."update_gym_member_role"(p_gym_id uuid, p_user_id uuid, p_new_role text);

drop function if exists "public"."verify_gym_display_key"(p_gym_id uuid, p_key text);

drop function if exists "public"."verify_submission"(p_submission_id uuid, p_status text);

alter table "public"."app_languages" drop constraint "app_languages_pkey";

alter table "public"."app_translations" drop constraint "app_translations_pkey";

alter table "public"."challenge_entries" drop constraint "challenge_entries_pkey";

alter table "public"."challenge_participants" drop constraint "challenge_participants_pkey";

alter table "public"."challenge_submissions" drop constraint "challenge_submissions_pkey";

alter table "public"."chat_rooms" drop constraint "chat_rooms_pkey";

alter table "public"."communities" drop constraint "communities_pkey";

alter table "public"."community_members" drop constraint "community_members_pkey";

alter table "public"."conversation_participants" drop constraint "conversation_participants_pkey";

alter table "public"."conversations" drop constraint "conversations_pkey";

alter table "public"."custom_exercises" drop constraint "custom_exercises_pkey";

alter table "public"."event_participants" drop constraint "event_participants_pkey";

alter table "public"."exercises" drop constraint "exercises_pkey";

alter table "public"."friendships" drop constraint "friendships_pkey";

alter table "public"."gym_challenges" drop constraint "gym_challenges_pkey";

alter table "public"."gym_events" drop constraint "gym_events_pkey";

alter table "public"."gym_invites" drop constraint "gym_invites_pkey";

alter table "public"."gym_monitors" drop constraint "gym_monitors_pkey";

alter table "public"."gym_news" drop constraint "gym_news_pkey";

alter table "public"."gym_tv_settings" drop constraint "gym_tv_settings_pkey";

alter table "public"."gyms" drop constraint "gyms_pkey";

alter table "public"."messages" drop constraint "messages_pkey";

alter table "public"."notifications" drop constraint "notifications_pkey";

alter table "public"."plan_assignments" drop constraint "plan_assignments_pkey";

alter table "public"."profiles" drop constraint "profiles_pkey";

alter table "public"."room_members" drop constraint "room_members_pkey";

alter table "public"."streaks" drop constraint "streaks_pkey";

alter table "public"."trainer_relationships" drop constraint "trainer_relationships_pkey";

alter table "public"."user_gyms" drop constraint "user_gyms_pkey";

alter table "public"."workout_likes" drop constraint "workout_likes_pkey";

alter table "public"."workout_logs" drop constraint "workout_logs_pkey";

alter table "public"."workout_plan_days" drop constraint "workout_plan_days_pkey";

alter table "public"."workout_plans" drop constraint "workout_plans_pkey";

alter table "public"."workout_sessions" drop constraint "workout_sessions_pkey";

alter table "public"."workout_templates" drop constraint "workout_templates_pkey";

alter table "public"."workouts" drop constraint "workouts_pkey";

drop index if exists "public"."app_languages_pkey";

drop index if exists "public"."app_translations_key_key";

drop index if exists "public"."app_translations_pkey";

drop index if exists "public"."challenge_entries_pkey";

drop index if exists "public"."challenge_participants_challenge_id_user_id_key";

drop index if exists "public"."challenge_participants_pkey";

drop index if exists "public"."challenge_submissions_pkey";

drop index if exists "public"."chat_rooms_pkey";

drop index if exists "public"."communities_gym_id_key";

drop index if exists "public"."communities_pkey";

drop index if exists "public"."community_members_pkey";

drop index if exists "public"."conversation_participants_pkey";

drop index if exists "public"."conversations_pkey";

drop index if exists "public"."custom_exercises_pkey";

drop index if exists "public"."event_participants_event_id_user_id_key";

drop index if exists "public"."event_participants_pkey";

drop index if exists "public"."exercises_name_key";

drop index if exists "public"."exercises_pkey";

drop index if exists "public"."friendships_pkey";

drop index if exists "public"."gym_challenges_pkey";

drop index if exists "public"."gym_events_pkey";

drop index if exists "public"."gym_invites_code_key";

drop index if exists "public"."gym_invites_pkey";

drop index if exists "public"."gym_monitors_pairing_code_key";

drop index if exists "public"."gym_monitors_pkey";

drop index if exists "public"."gym_news_pkey";

drop index if exists "public"."gym_tv_settings_pkey";

drop index if exists "public"."gyms_access_code_admin_key";

drop index if exists "public"."gyms_access_code_trainer_key";

drop index if exists "public"."gyms_pkey";

drop index if exists "public"."idx_app_translations_category";

drop index if exists "public"."idx_communities_gym_id";

drop index if exists "public"."idx_community_members_community_id";

drop index if exists "public"."idx_community_members_user_id";

drop index if exists "public"."idx_conversation_participants_deleted_at";

drop index if exists "public"."idx_friendships_friend_status";

drop index if exists "public"."idx_friendships_user_status";

drop index if exists "public"."idx_gym_events_gym_date";

drop index if exists "public"."idx_gym_monitors_pairing_code";

drop index if exists "public"."idx_gym_news_gym_active";

drop index if exists "public"."idx_gym_tv_settings_gym";

drop index if exists "public"."idx_messages_conversation";

drop index if exists "public"."idx_messages_created_at";

drop index if exists "public"."idx_participants_user";

drop index if exists "public"."idx_profiles_level";

drop index if exists "public"."idx_profiles_name_search";

drop index if exists "public"."idx_profiles_trainer_code";

drop index if exists "public"."idx_profiles_username_search";

drop index if exists "public"."idx_profiles_xp";

drop index if exists "public"."idx_user_gyms_user_id";

drop index if exists "public"."idx_workout_sessions_group_id";

drop index if exists "public"."idx_workout_sessions_gym_poll";

drop index if exists "public"."idx_workout_sessions_user_status";

drop index if exists "public"."idx_workouts_gym_id";

drop index if exists "public"."messages_pkey";

drop index if exists "public"."notifications_created_at_idx";

drop index if exists "public"."notifications_pkey";

drop index if exists "public"."notifications_user_id_idx";

drop index if exists "public"."plan_assignments_pkey";

drop index if exists "public"."profiles_pkey";

drop index if exists "public"."profiles_trainer_code_key";

drop index if exists "public"."profiles_username_key";

drop index if exists "public"."room_members_pkey";

drop index if exists "public"."streaks_pkey";

drop index if exists "public"."trainer_relationships_pkey";

drop index if exists "public"."trainer_relationships_trainer_id_client_id_key";

drop index if exists "public"."unique_friendship";

drop index if exists "public"."user_gyms_pkey";

drop index if exists "public"."workout_likes_pkey";

drop index if exists "public"."workout_likes_workout_id_user_id_key";

drop index if exists "public"."workout_logs_pkey";

drop index if exists "public"."workout_plan_days_pkey";

drop index if exists "public"."workout_plans_pkey";

drop index if exists "public"."workout_sessions_pkey";

drop index if exists "public"."workout_templates_pkey";

drop index if exists "public"."workouts_pkey";

drop table "public"."app_languages";

drop table "public"."app_translations";

drop table "public"."challenge_entries";

drop table "public"."challenge_participants";

drop table "public"."challenge_submissions";

drop table "public"."chat_rooms";

drop table "public"."communities";

drop table "public"."community_members";

drop table "public"."conversation_participants";

drop table "public"."conversations";

drop table "public"."custom_exercises";

drop table "public"."event_participants";

drop table "public"."exercises";

drop table "public"."friendships";

drop table "public"."gym_challenges";

drop table "public"."gym_events";

drop table "public"."gym_invites";

drop table "public"."gym_monitors";

drop table "public"."gym_news";

drop table "public"."gym_tv_settings";

drop table "public"."gyms";

drop table "public"."messages";

drop table "public"."notifications";

drop table "public"."plan_assignments";

drop table "public"."profiles";

drop table "public"."room_members";

drop table "public"."streaks";

drop table "public"."trainer_relationships";

drop table "public"."user_gyms";

drop table "public"."workout_likes";

drop table "public"."workout_logs";

drop table "public"."workout_plan_days";

drop table "public"."workout_plans";

drop table "public"."workout_sessions";

drop table "public"."workout_templates";

drop table "public"."workouts";

drop trigger if exists "enforce_bucket_name_length_trigger" on "storage"."buckets";

drop trigger if exists "update_objects_updated_at" on "storage"."objects";


