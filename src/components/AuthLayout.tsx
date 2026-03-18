import AppLogo from "./AppLogo";
import Notification from "./Notification";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen w-full lg:flex-row flex-col relative">
      <Notification />
      <div className="flex-1 bg-white bg-grid-pattern flex items-center justify-center p-8 md:min-h-screen min-h-[60vh]">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>

      <div className="flex-1 bg-primary-gradient relative hidden lg:block md:min-h-screen min-h-[40vh] overflow-hidden">
        <AppLogo
          variant="icon"
          className="text-[#1E0E50]/70 absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
          iconClassName="h-240 w-auto max-w-full"
        />
      </div>
    </div>
  );
};

export default AuthLayout;
