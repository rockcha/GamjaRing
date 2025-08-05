import { Outlet } from "react-router-dom";
import MainHeader from "@/components/MainHeader";
import PageTransition from "@/components/PageTransition";

export default function AppLayout() {
  return (
    <>
      <MainHeader />
      <main>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </>
  );
}
