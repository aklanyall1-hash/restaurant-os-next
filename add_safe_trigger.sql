-- Trigger آمن: ينشئ profile تلقائياً لأي مستخدم جديد في auth.users
-- بدون restaurant_id أو role محددين (تتضبط بعدين من صفحة /admin)
-- استخدمنا exception handling عشان لو حصل أي خطأ، إنشاء المستخدم
-- في auth.users ميفشلش بسببه (وده كان سبب الـ bug القديم)

CREATE OR REPLACE FUNCTION handle_new_user_safe()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'staff')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- لو فيه أي خطأ غير متوقع، نسجله بس مننعش إنشاء المستخدم
  RAISE WARNING 'handle_new_user_safe failed: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_safe ON auth.users;
CREATE TRIGGER on_auth_user_created_safe
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_safe();
