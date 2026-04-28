DROP TRIGGER IF EXISTS accept_client_invitation_on_signup ON auth.users;
DROP TRIGGER IF EXISTS accept_client_invitation ON auth.users;
DROP TRIGGER IF EXISTS accept_client_invitation_trigger ON auth.users;
DROP TRIGGER IF EXISTS accept_client_invitation_on_signup_trigger ON auth.users;

DROP FUNCTION IF EXISTS public.accept_client_invitation();

CREATE TRIGGER accept_client_invitation_on_signup_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.accept_client_invitation_on_signup();