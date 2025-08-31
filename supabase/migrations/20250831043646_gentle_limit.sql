/*
  # Fix User Profile Creation

  1. Database Function
    - Create function to automatically create user profile when auth user is created
    - Handle profile data from auth metadata

  2. Database Trigger
    - Trigger on auth.users insert to create corresponding user_profiles record
    - Extract metadata from auth user and populate profile

  3. Security
    - Ensure RLS policies allow profile creation
    - Handle edge cases and errors gracefully
*/

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    role
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', NULL),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'parent'::user_role)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update RLS policy to allow profile creation during signup
DROP POLICY IF EXISTS "Allow profile creation during signup" ON user_profiles;
CREATE POLICY "Allow profile creation during signup"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);